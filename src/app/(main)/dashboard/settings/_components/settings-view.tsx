"use client";

import * as React from "react";

import { Bot, Filter, Server } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/app/(main)/dashboard/_components/dashboard-page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AiProvider } from "@/server/db/settings";

import { AiProviderModal } from "./ai-provider-modal";
import { AiProviderTable } from "./ai-provider-table";
import { BitbucketSettingsCard } from "./bitbucket-settings-card";
import { DiffFilterCard } from "./diff-filter-card";

interface SettingsDataResponse {
  bitbucket: {
    baseUrl: string;
    token: string;
    hasToken: boolean;
    seniorUserSlug: string;
  };
  aiProviders: AiProvider[];
  defaultProviderId?: string;
}

export function SettingsView() {
  const [activeTab, setActiveTab] = React.useState<string>("ai");
  const [_isLoading, setIsLoading] = React.useState(true);

  // Bitbucket state
  const [bbUrl, setBbUrl] = React.useState("https://bitbucket.bri.co.id");
  const [bbToken, setBbToken] = React.useState("");
  const [bbSeniorSlug, setBbSeniorSlug] = React.useState("senior.lead");

  // Multi-provider AI state
  const [aiProviders, setAiProviders] = React.useState<AiProvider[]>([]);
  const [testingProviderId, setTestingProviderId] = React.useState<
    string | null
  >(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [providerToEdit, setProviderToEdit] = React.useState<AiProvider | null>(
    null,
  );

  // Load all settings on mount
  const loadSettings = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const d: SettingsDataResponse = json.data;
        if (d.bitbucket) {
          setBbUrl(d.bitbucket.baseUrl || "https://bitbucket.bri.co.id");
          setBbToken(d.bitbucket.token || "");
          setBbSeniorSlug(d.bitbucket.seniorUserSlug || "senior.lead");
        }
        if (Array.isArray(d.aiProviders)) {
          setAiProviders(d.aiProviders);
        }
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan sistem:", err);
      toast.error("Gagal memuat konfigurasi dari database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Open modal for new provider
  const handleOpenAdd = () => {
    setProviderToEdit(null);
    setIsModalOpen(true);
  };

  // Open modal for editing provider
  const handleOpenEdit = (provider: AiProvider) => {
    setProviderToEdit(provider);
    setIsModalOpen(true);
  };

  // Save new or edited provider
  const handleSaveProvider = async (provider: AiProvider) => {
    let nextList: AiProvider[];
    const exists = aiProviders.some((p) => p.id === provider.id);

    if (exists) {
      nextList = aiProviders.map((p) => {
        if (p.id === provider.id) return provider;
        // If this provider was made default, remove default from others
        if (provider.isDefault) return { ...p, isDefault: false };
        return p;
      });
    } else {
      if (provider.isDefault || aiProviders.length === 0) {
        provider.isDefault = true;
        nextList = [
          ...aiProviders.map((p) => ({ ...p, isDefault: false })),
          provider,
        ];
      } else {
        nextList = [...aiProviders, provider];
      }
    }

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiProviders: nextList }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setAiProviders(nextList);
      toast.success(
        exists
          ? "Provider Berhasil Diperbarui"
          : "Provider AI Baru Ditambahkan",
        {
          description: `Konfigurasi '${provider.name}' disimpan ke database.`,
        },
      );
    } else {
      throw new Error(data.message || "Gagal menyimpan ke database.");
    }
  };

  // Set provider as default
  const handleSetDefault = async (providerId: string) => {
    const nextList = aiProviders.map((p) => ({
      ...p,
      isDefault: p.id === providerId,
    }));

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiProviders: nextList }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiProviders(nextList);
        const target = nextList.find((p) => p.id === providerId);
        toast.success(`'${target?.name}' Dijadikan Provider Utama`, {
          description:
            "Provider ini akan dipilih secara default saat memindai kode.",
        });
      } else {
        toast.error(data.message || "Gagal mengubah provider default.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    }
  };

  // Delete provider
  const handleDeleteProvider = async (providerId: string) => {
    if (aiProviders.length <= 1) {
      toast.error(
        "Tidak dapat menghapus. Sistem membutuhkan minimal 1 provider aktif.",
      );
      return;
    }

    const target = aiProviders.find((p) => p.id === providerId);
    const nextList = aiProviders.filter((p) => p.id !== providerId);

    // If deleted provider was default, make the first remaining default
    if (target?.isDefault && nextList.length > 0) {
      nextList[0] = { ...nextList[0], isDefault: true };
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiProviders: nextList }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiProviders(nextList);
        toast.success(`Provider '${target?.name}' Dihapus`);
      } else {
        toast.error(data.message || "Gagal menghapus provider.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan saat menghapus.");
    }
  };

  // Test provider connection
  const handleTestConnection = async (provider: AiProvider) => {
    setTestingProviderId(provider.id);
    const testModel =
      provider.defaultModel ?? provider.models[0] ?? "deepseek-flash";

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "ai",
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: testModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data?.status === "OK") {
        toast.success(`Koneksi '${provider.name}' Berhasil!`, {
          description:
            data.data?.message ||
            `Endpoint merespons dengan model '${testModel}'.`,
        });
      } else {
        toast.error(`Koneksi '${provider.name}' Gagal`, {
          description:
            data.data?.message ||
            data.message ||
            "Endpoint tidak dapat dihubungi.",
        });
      }
    } catch {
      toast.error(`Gagal menguji koneksi provider '${provider.name}'.`);
    } finally {
      setTestingProviderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <DashboardPageHeader
        title="Pengaturan & Integrasi Sistem"
        description="Kelola penyedia model AI eksternal, integrasi Bitbucket Server, dan aturan optimasi diff token."
      />

      {/* Tabs Navigation for Minimal Distraction & Low Cognitive Load */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid h-9 w-full max-w-md grid-cols-3 text-xs">
          <TabsTrigger value="ai" className="gap-1.5 font-medium text-xs">
            <Bot className="size-3.5" />
            Provider AI
          </TabsTrigger>
          <TabsTrigger
            value="bitbucket"
            className="gap-1.5 font-medium text-xs"
          >
            <Server className="size-3.5" />
            Bitbucket Server
          </TabsTrigger>
          <TabsTrigger value="diff" className="gap-1.5 font-medium text-xs">
            <Filter className="size-3.5" />
            Kebijakan Diff
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: AI Providers Table View */}
        <TabsContent value="ai" className="space-y-4">
          <AiProviderTable
            providers={aiProviders}
            onAddClick={handleOpenAdd}
            onEditClick={handleOpenEdit}
            onSetDefault={handleSetDefault}
            onDeleteClick={handleDeleteProvider}
            onTestConnection={handleTestConnection}
            testingProviderId={testingProviderId}
          />
        </TabsContent>

        {/* Tab 2: Bitbucket Server Settings */}
        <TabsContent value="bitbucket" className="space-y-4">
          <BitbucketSettingsCard
            initialUrl={bbUrl}
            initialToken={bbToken}
            initialSeniorSlug={bbSeniorSlug}
            onSaveSuccess={loadSettings}
          />
        </TabsContent>

        {/* Tab 3: Diff Filtering Rules */}
        <TabsContent value="diff" className="space-y-4">
          <DiffFilterCard />
        </TabsContent>
      </Tabs>

      {/* Add / Edit AI Provider Modal */}
      <AiProviderModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        providerToEdit={providerToEdit}
        onSave={handleSaveProvider}
      />
    </div>
  );
}
