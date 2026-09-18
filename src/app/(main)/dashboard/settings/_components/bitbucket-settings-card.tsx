"use client";

import * as React from "react";

import { Eye, EyeOff, RefreshCw, Save, Server } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BitbucketSettingsCardProps {
  initialUrl: string;
  initialToken: string;
  initialSeniorSlug: string;
  onSaveSuccess?: () => void;
}

export function BitbucketSettingsCard({
  initialUrl,
  initialToken,
  initialSeniorSlug,
  onSaveSuccess,
}: BitbucketSettingsCardProps) {
  const [bbUrl, setBbUrl] = React.useState(initialUrl);
  const [bbToken, setBbToken] = React.useState(initialToken);
  const [bbSeniorSlug, setBbSeniorSlug] = React.useState(initialSeniorSlug);
  const [showBbToken, setShowBbToken] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  React.useEffect(() => {
    setBbUrl(initialUrl || "https://bitbucket.bri.co.id");
    setBbToken(initialToken || "");
    setBbSeniorSlug(initialSeniorSlug || "senior.lead");
  }, [initialUrl, initialToken, initialSeniorSlug]);

  const handleSaveBitbucket = async () => {
    if (!bbUrl.trim()) {
      toast.error("Endpoint URL Bitbucket Server tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
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
        onSaveSuccess?.();
      } else {
        toast.error(data.message || "Gagal menyimpan pengaturan Bitbucket.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan saat menyimpan konfigurasi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestBitbucket = async () => {
    if (!bbUrl.trim()) {
      toast.error("Endpoint URL Bitbucket Server tidak boleh kosong.");
      return;
    }

    setIsTesting(true);
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
        toast.success("Koneksi Bitbucket Berhasil!", {
          description: data.data?.message || "Terhubung ke Bitbucket Server.",
        });
      } else {
        toast.error("Koneksi Bitbucket Gagal", {
          description: data.data?.message || data.message || "Endpoint tidak dapat dihubungi.",
        });
      }
    } catch {
      toast.error("Gagal melakukan pengujian koneksi Bitbucket Server.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="overflow-hidden border shadow-xs">
      <CardHeader className="border-b bg-muted/20 pb-3">
        <div className="flex items-center gap-2">
          <Server className="size-4 text-primary" />
          <CardTitle className="font-semibold text-base">Integrasi Bitbucket Server 8.19</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Koneksi REST API untuk sinkronisasi pull request, pengambilan diff, dan penerbitan komentar review.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-4 text-xs sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="bb-url" className="font-semibold text-xs">
              Bitbucket Server Endpoint URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bb-url"
              value={bbUrl}
              onChange={(e) => setBbUrl(e.target.value)}
              placeholder="https://bitbucket.bri.co.id"
              className="h-9 font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bb-token" className="font-semibold text-xs">
              Personal Access Token (PAT)
            </Label>
            <div className="relative">
              <Input
                id="bb-token"
                type={showBbToken ? "text" : "password"}
                value={bbToken}
                onChange={(e) => setBbToken(e.target.value)}
                placeholder="BBDC-..."
                className="h-9 pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowBbToken(!showBbToken)}
                className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                title={showBbToken ? "Sembunyikan" : "Tampilkan"}
              >
                {showBbToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bb-senior-slug" className="font-semibold text-xs">
              Reviewer User Slug
            </Label>
            <Input
              id="bb-senior-slug"
              value={bbSeniorSlug}
              onChange={(e) => setBbSeniorSlug(e.target.value)}
              placeholder="senior.lead"
              className="h-9 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" onClick={handleSaveBitbucket} disabled={isSaving} className="gap-1.5 font-semibold text-xs">
            <Save className={`size-3.5 ${isSaving ? "animate-spin" : ""}`} />
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan Bitbucket"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestBitbucket}
            disabled={isTesting}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isTesting ? "animate-spin" : ""}`} />
            {isTesting ? "Menguji..." : "Uji Koneksi"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
