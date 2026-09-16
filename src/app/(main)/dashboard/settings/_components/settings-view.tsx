"use client";

import * as React from "react";
import {
  Bot,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
  Save,
  Server,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SystemSettingsResponse {
  bitbucket: {
    baseUrl: string;
    token: string;
    hasToken: boolean;
    seniorUserSlug: string;
  };
  ai: {
    baseUrl: string;
    apiKey: string;
    model: string;
    hasApiKey: boolean;
  };
}

export function SettingsView() {
  // Bitbucket Form State
  const [bbUrl, setBbUrl] = React.useState("https://bitbucket.bri.co.id");
  const [bbToken, setBbToken] = React.useState("");
  const [bbSeniorSlug, setBbSeniorSlug] = React.useState("senior.lead");
  const [showBbToken, setShowBbToken] = React.useState(false);

  // AI Gateway Form State
  const [aiBaseUrl, setAiBaseUrl] = React.useState("https://organization.api-github.com/v1");
  const [aiApiKey, setAiApiKey] = React.useState("");
  const [aiModel, setAiModel] = React.useState("deepseek-flash");
  const [showAiKey, setShowAiKey] = React.useState(false);

  // Status & Loading States
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isSavingBb, setIsSavingBb] = React.useState(false);
  const [isSavingAi, setIsSavingAi] = React.useState(false);
  const [isTestingBb, setIsTestingBb] = React.useState(false);
  const [isTestingAi, setIsTestingAi] = React.useState(false);
  const [bbStatus, setBbStatus] = React.useState<"IDLE" | "OK" | "FAILED">("IDLE");
  const [aiStatus, setAiStatus] = React.useState<"IDLE" | "OK" | "FAILED">("IDLE");

  // Load Settings from Database on mount
  const loadSettings = React.useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const d: SystemSettingsResponse = json.data;
        if (d.bitbucket) {
          setBbUrl(d.bitbucket.baseUrl || "https://bitbucket.bri.co.id");
          setBbToken(d.bitbucket.token || "");
          setBbSeniorSlug(d.bitbucket.seniorUserSlug || "senior.lead");
        }
        if (d.ai) {
          setAiBaseUrl(d.ai.baseUrl || "https://organization.api-github.com/v1");
          setAiApiKey(d.ai.apiKey || "");
          setAiModel(d.ai.model || "deepseek-flash");
        }
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan sistem:", err);
      toast.error("Gagal memuat konfigurasi dari database");
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save Bitbucket Configuration to Database
  const handleSaveBitbucket = async () => {
    if (!bbUrl.trim()) {
      toast.error("Endpoint URL Bitbucket Server tidak boleh kosong.");
      return;
    }
    setIsSavingBb(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bitbucket_base_url: bbUrl.trim(),
          bitbucket_access_token: bbToken.trim(),
          senior_user_slug: bbSeniorSlug.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Pengaturan Bitbucket Berhasil Disimpan!", {
          description: "Konfigurasi aktif disimpan ke database PostgreSQL.",
        });
      } else {
        toast.error(data.message || "Gagal menyimpan pengaturan Bitbucket ke database.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan saat menyimpan konfigurasi.");
    } finally {
      setIsSavingBb(false);
    }
  };

  // Save AI Configuration to Database
  const handleSaveAi = async () => {
    if (!aiBaseUrl.trim() || !aiModel.trim()) {
      toast.error("Base URL dan Model Name AI tidak boleh kosong.");
      return;
    }
    setIsSavingAi(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openai_base_url: aiBaseUrl.trim(),
          qodeer_api_key: aiApiKey.trim(),
          openai_model: aiModel.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Pengaturan AI Gateway Berhasil Disimpan!", {
          description: "Konfigurasi aktif disimpan ke database PostgreSQL.",
        });
      } else {
        toast.error(data.message || "Gagal menyimpan pengaturan AI ke database.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan saat menyimpan konfigurasi AI.");
    } finally {
      setIsSavingAi(false);
    }
  };

  // Test Bitbucket Connection with current input
  const testBitbucketConnection = async () => {
    setIsTestingBb(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "bitbucket",
          baseUrl: bbUrl.trim(),
          token: bbToken.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.status === "OK") {
        setBbStatus("OK");
        toast.success("Pengujian Bitbucket Server Berhasil!", {
          description: data.data?.message || "Terhubung ke Bitbucket Server.",
        });
      } else {
        setBbStatus("FAILED");
        toast.error("Koneksi Bitbucket Server Gagal", {
          description: data.data?.message || data.message || "Endpoint tidak dapat dihubungi.",
        });
      }
    } catch {
      setBbStatus("FAILED");
      toast.error("Gagal melakukan pengujian koneksi Bitbucket Server.");
    } finally {
      setIsTestingBb(false);
    }
  };

  // Test AI Connection with current input
  const testAiConnection = async () => {
    setIsTestingAi(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "ai",
          baseUrl: aiBaseUrl.trim(),
          apiKey: aiApiKey.trim(),
          model: aiModel.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.status === "OK") {
        setAiStatus("OK");
        toast.success("Koneksi AI Gateway Berhasil!", {
          description: data.data?.message || "Model siap memproses review.",
        });
      } else {
        setAiStatus("FAILED");
        toast.error("Koneksi AI Gateway Gagal", {
          description: data.data?.message || data.message || "Model atau gateway tidak responsif.",
        });
      }
    } catch {
      setAiStatus("FAILED");
      toast.error("Gagal menghubungi endpoint AI Gateway.");
    } finally {
      setIsTestingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl text-foreground">
          Integrasi & Pengaturan Sistem
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Konfigurasi koneksi Bitbucket Server 8.19 REST API dan OpenAI Gateway yang tersimpan dinamis di database.
        </p>
      </div>

      {/* Main Configuration Grid: 2 Column Layout (PostgreSQL card removed) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bitbucket Server 8.19 Dynamic Settings Card */}
        <Card className="shadow-xs border flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-primary" />
                  <CardTitle className="text-base font-semibold">Bitbucket Server v8.19</CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs gap-1 font-mono ${
                    bbStatus === "OK"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : bbStatus === "FAILED"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        : "border-border bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {bbStatus === "OK" ? (
                    <>
                      <CheckCircle2 className="size-3" />
                      Terhubung
                    </>
                  ) : bbStatus === "FAILED" ? (
                    <>
                      <XCircle className="size-3" />
                      Offline / Gagal
                    </>
                  ) : (
                    "Siap Diuji"
                  )}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Koneksi REST API untuk operasi fetch diff, inline comments, approve, needs work, dan decline.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Bitbucket Server Endpoint URL</span>
                  <span className="text-[11px] text-muted-foreground font-mono">Contoh: https://bitbucket.bri.co.id</span>
                </label>
                <Input
                  value={bbUrl}
                  onChange={(e) => setBbUrl(e.target.value)}
                  placeholder="https://bitbucket.bri.co.id"
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Personal Access Token (PAT)</label>
                  <span className="text-[11px] text-muted-foreground font-mono">Kunci Otentikasi Bot</span>
                </div>
                <div className="relative">
                  <Input
                    type={showBbToken ? "text" : "password"}
                    value={bbToken}
                    onChange={(e) => setBbToken(e.target.value)}
                    placeholder="Masukkan Personal Access Token Bitbucket..."
                    className="font-mono text-xs h-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBbToken(!showBbToken)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title={showBbToken ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showBbToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>


              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Senior Reviewer User Slug</span>
                  <span className="text-[11px] text-muted-foreground font-mono">Partisipan Needs Work</span>
                </label>
                <Input
                  value={bbSeniorSlug}
                  onChange={(e) => setBbSeniorSlug(e.target.value)}
                  placeholder="senior.lead"
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="rounded bg-muted/40 p-3 border space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Header Otomatis:</span>
                  <code className="font-mono text-foreground">X-Atlassian-Token: no-check</code>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Penyimpanan:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    PostgreSQL Table (system_settings)
                  </span>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-4 pt-0 flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveBitbucket}
              disabled={isSavingBb}
              className="flex-1 gap-1.5 text-xs font-semibold"
            >
              <Save className={`size-3.5 ${isSavingBb ? "animate-spin" : ""}`} />
              {isSavingBb ? "Menyimpan ke DB..." : "Simpan Konfigurasi Bitbucket"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={testBitbucketConnection}
              disabled={isTestingBb}
              className="gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`size-3.5 ${isTestingBb ? "animate-spin" : ""}`} />
              {isTestingBb ? "Menguji..." : "Uji Koneksi"}
            </Button>
          </div>
        </Card>

        {/* OpenAI SDK / Qodeer Gateway Dynamic Settings Card */}
        <Card className="shadow-xs border flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-indigo-500" />
                  <CardTitle className="text-base font-semibold">OpenAI SDK (Qodeer Gateway)</CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs gap-1 font-mono ${
                    aiStatus === "OK"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : aiStatus === "FAILED"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        : "border-border bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {aiStatus === "OK" ? (
                    <>
                      <CheckCircle2 className="size-3" />
                      Tersedia
                    </>
                  ) : aiStatus === "FAILED" ? (
                    <>
                      <XCircle className="size-3" />
                      Offline / Gagal
                    </>
                  ) : (
                    "Siap Diuji"
                  )}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Spesifikasi endpoint AI Review Worker sesuai Aturan Bisnis BR-03 (OpenAI SDK kompatibel).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Custom Base URL (OpenAI Client)</span>
                  <span className="text-[11px] text-muted-foreground font-mono">Endpoint Gateway</span>
                </label>
                <Input
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder="https://organization.api-github.com/v1"
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">API Key / Token Otentikasi</label>
                  <span className="text-[11px] text-muted-foreground font-mono">Header: Authorization Bearer</span>
                </div>
                <div className="relative">
                  <Input
                    type={showAiKey ? "text" : "password"}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="Masukkan API Key Qodeer Gateway..."
                    className="font-mono text-xs h-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKey(!showAiKey)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title={showAiKey ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showAiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Model Identifier</span>
                  <span className="text-[11px] text-muted-foreground font-mono">Contoh: deepseek-flash</span>
                </label>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="deepseek-flash"
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="rounded bg-muted/40 p-3 border space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Format Output:</span>
                  <code className="font-mono text-foreground">response_format: json_object</code>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Penyimpanan:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    PostgreSQL Table (system_settings)
                  </span>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-4 pt-0 flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveAi}
              disabled={isSavingAi}
              className="flex-1 gap-1.5 text-xs font-semibold"
            >
              <Save className={`size-3.5 ${isSavingAi ? "animate-spin" : ""}`} />
              {isSavingAi ? "Menyimpan ke DB..." : "Simpan Konfigurasi AI"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={testAiConnection}
              disabled={isTestingAi}
              className="gap-1.5 text-xs font-medium"
            >
              <Cpu className={`size-3.5 text-indigo-500 ${isTestingAi ? "animate-spin" : ""}`} />
              {isTestingAi ? "Menguji..." : "Uji Koneksi AI"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Auto-Filtering Rules Card (BR-02 & BR-10) */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">
              Kebijakan Diff Filtering & Token Optimization (BR-02 & BR-10)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            File yang otomatis dikecualikan dari prompt AI untuk mencegah pemborosan token dan noise review.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded border bg-muted/40 p-3 space-y-1">
              <span className="font-semibold text-foreground block">Package & Lockfiles:</span>
              <p className="text-muted-foreground font-mono text-[11px]">
                *-lock.yaml, package-lock.json, yarn.lock, Cargo.lock, go.sum
              </p>
            </div>

            <div className="rounded border bg-muted/40 p-3 space-y-1">
              <span className="font-semibold text-foreground block">Minified & Generated:</span>
              <p className="text-muted-foreground font-mono text-[11px]">
                *.min.js, *.min.css, *.map, dist/**, .next/**, vendor/**
              </p>
            </div>

            <div className="rounded border bg-muted/40 p-3 space-y-1">
              <span className="font-semibold text-foreground block">Asset Media & Font:</span>
              <p className="text-muted-foreground font-mono text-[11px]">
                *.png, *.jpg, *.jpeg, *.svg, *.webp, *.woff, *.woff2, *.ico
              </p>
            </div>
          </div>

          <div className="rounded bg-primary/5 border border-primary/10 p-3 text-[11px] text-muted-foreground">
            <strong>Batas Partisi Diff (BR-10):</strong> Jika diff melebihi 30.000 token atau 100 KB, sistem otomatis membagi partisi per file (chunking) untuk menjamin stabilitas LLM context window.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
