"use client";

import * as React from "react";

import { Bot, Eye, EyeOff, Plus, RefreshCw, Star, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AiProvider } from "@/server/db/settings";

interface AiProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerToEdit?: AiProvider | null;
  onSave: (provider: AiProvider) => Promise<void>;
}

export function AiProviderModal({ open, onOpenChange, providerToEdit, onSave }: AiProviderModalProps) {
  const isEditing = Boolean(providerToEdit);

  const [name, setName] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [models, setModels] = React.useState<string[]>([]);
  const [defaultModel, setDefaultModel] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);

  // New model input state
  const [modelInput, setModelInput] = React.useState("");

  // Testing connection state
  const [isTesting, setIsTesting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync state when modal opens or providerToEdit changes
  React.useEffect(() => {
    if (open) {
      if (providerToEdit) {
        setName(providerToEdit.name || "");
        setBaseUrl(providerToEdit.baseUrl || "");
        setApiKey(providerToEdit.apiKey || "");
        const initModels =
          providerToEdit.models && providerToEdit.models.length > 0 ? [...providerToEdit.models] : ["deepseek-flash"];
        setModels(initModels);
        setDefaultModel(providerToEdit.defaultModel || initModels[0]);
        setIsDefault(Boolean(providerToEdit.isDefault));
      } else {
        setName("");
        setBaseUrl("https://organization.api-github.com/v1");
        setApiKey("");
        setModels(["deepseek-flash"]);
        setDefaultModel("deepseek-flash");
        setIsDefault(false);
      }
      setModelInput("");
      setShowApiKey(false);
    }
  }, [open, providerToEdit]);

  const handleAddModel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = modelInput.trim();
    if (!trimmed) return;

    if (models.includes(trimmed)) {
      toast.warning(`Model '${trimmed}' sudah terdaftar.`);
      setModelInput("");
      return;
    }

    const nextModels = [...models, trimmed];
    setModels(nextModels);
    if (!defaultModel || models.length === 0) {
      setDefaultModel(trimmed);
    }
    setModelInput("");
  };

  const handleRemoveModel = (modelToRemove: string) => {
    if (models.length <= 1) {
      toast.error("Setidaknya harus ada 1 model pilihan yang terdaftar.");
      return;
    }
    const nextModels = models.filter((m) => m !== modelToRemove);
    setModels(nextModels);
    if (defaultModel === modelToRemove) {
      setDefaultModel(nextModels[0]);
    }
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      toast.error("Base URL tidak boleh kosong.");
      return;
    }

    const testModel = defaultModel || models[0] || "deepseek-flash";
    setIsTesting(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "ai",
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          model: testModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data?.status === "OK") {
        toast.success("Koneksi Provider Berhasil!", {
          description: data.data?.message || `Endpoint merespons dengan model '${testModel}'.`,
        });
      } else {
        toast.error("Koneksi Provider Gagal", {
          description: data.data?.message || data.message || "Endpoint tidak dapat dihubungi.",
        });
      }
    } catch {
      toast.error("Gagal menghubungi endpoint provider AI.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nama provider wajib diisi.");
      return;
    }
    if (!baseUrl.trim()) {
      toast.error("Base URL endpoint wajib diisi.");
      return;
    }
    if (models.length === 0) {
      toast.error("Masukkan minimal satu nama model AI.");
      return;
    }

    const finalDefaultModel = models.includes(defaultModel) ? defaultModel : models[0];

    const providerData: AiProvider = {
      id: providerToEdit?.id || `provider-${Date.now()}`,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      models,
      defaultModel: finalDefaultModel,
      isDefault,
      modelUsage: providerToEdit?.modelUsage ?? {},
      createdAt: providerToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await onSave(providerData);
      onOpenChange(false);
    } catch (err) {
      console.error("Save provider error:", err);
      toast.error("Gagal menyimpan data provider AI.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border p-0 shadow-lg sm:max-w-[560px]">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader className="border-b bg-muted/20 p-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-4" />
              </div>
              <div>
                <DialogTitle className="font-semibold text-base">
                  {isEditing ? "Edit Provider AI" : "Tambah Provider AI"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-muted-foreground text-xs">
                  Konfigurasi endpoint OpenAI-compatible dan daftarkan model yang dapat dipilih.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
            {/* Provider Name */}
            <div className="space-y-1.5">
              <Label htmlFor="provider-name" className="font-semibold text-xs">
                Nama Provider <span className="text-destructive">*</span>
              </Label>
              <Input
                id="provider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth. Qodeer Gateway, OpenAI Official, DeepSeek"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <Label htmlFor="provider-base-url" className="font-semibold text-xs">
                Endpoint Base URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="provider-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://organization.api-github.com/v1"
                className="h-9 font-mono text-xs"
                required
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <Label htmlFor="provider-api-key" className="font-semibold text-xs">
                API Key / Auth Token
              </Label>
              <div className="relative">
                <Input
                  id="provider-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Masukkan API Key (jika memerlukan otentikasi)..."
                  className="h-9 pr-9 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                  title={showApiKey ? "Sembunyikan" : "Tampilkan"}
                >
                  {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Manual Multiple Models Input */}
            <div className="space-y-2 rounded-lg border bg-muted/10 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-xs">Pilihan Model AI</Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Ketik nama model dan tekan{" "}
                    <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd> atau klik
                    Tambah.
                  </p>
                </div>
                <Badge variant="outline" className="font-normal text-[10px]">
                  {models.length} Model
                </Badge>
              </div>

              {/* Input for adding new model */}
              <div className="flex items-center gap-2">
                <Input
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddModel();
                    }
                  }}
                  placeholder="cth. deepseek-flash, gpt-4o, mai-code-1..."
                  className="h-8 flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddModel()}
                  className="h-8 shrink-0 gap-1 text-xs"
                >
                  <Plus className="size-3.5" />
                  Tambah
                </Button>
              </div>

              {/* Model Badges List */}
              <div className="flex min-h-[32px] flex-wrap gap-1.5 pt-1">
                {models.map((m) => {
                  const isCurrentDefault = m === defaultModel;
                  return (
                    <div
                      key={m}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                        isCurrentDefault
                          ? "border-primary/40 bg-primary/10 font-medium text-primary shadow-xs"
                          : "border-border bg-background text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setDefaultModel(m)}
                        title={isCurrentDefault ? "Model default aktif" : "Jadikan model default untuk provider ini"}
                        className="flex items-center gap-1 hover:opacity-80"
                      >
                        <Star
                          className={`size-3 ${isCurrentDefault ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                        <span className="font-mono text-[11px]">{m}</span>
                      </button>

                      {isCurrentDefault && (
                        <span className="rounded bg-primary/20 px-1 py-0.2 font-semibold text-[9px] text-primary uppercase">
                          Default
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveModel(m)}
                        className="ml-0.5 text-muted-foreground transition-colors hover:text-destructive"
                        title="Hapus model"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Default Provider Switch */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="default-provider-switch" className="cursor-pointer font-semibold text-xs">
                  Jadikan Provider Utama (Default)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Provider ini akan otomatis dipilih pertama kali saat melakukan scan Pull Request.
                </p>
              </div>
              <Switch id="default-provider-switch" checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </div>

          <div className="m-0 flex items-center justify-between border-t bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="h-9 gap-1.5 px-3.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isTesting ? "animate-spin" : ""}`} />
              {isTesting ? "Menguji..." : "Uji Koneksi"}
            </Button>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 px-3.5 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="h-9 gap-1.5 px-4 font-semibold text-xs">
                {(() => {
                  if (isSaving) return "Menyimpan...";
                  if (isEditing) return "Simpan Perubahan";
                  return "Simpan Provider";
                })()}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
