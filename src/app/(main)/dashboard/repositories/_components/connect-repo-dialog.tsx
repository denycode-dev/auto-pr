"use client";

import * as React from "react";

import { Server } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Repository } from "@/data/code-review/types";

interface ConnectRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRepo: (repo: Repository) => void;
}

export function ConnectRepoDialog({ open, onOpenChange, onAddRepo }: ConnectRepoDialogProps) {
  const [projectKey, setProjectKey] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [name, setName] = React.useState("");
  const [defaultBranch, setDefaultBranch] = React.useState("main");
  const [isTesting, setIsTesting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectKey.trim() || !slug.trim() || !name.trim()) {
      toast.error("Semua field wajib diisi.");
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectKey: projectKey.toUpperCase().trim(),
          slug: slug.toLowerCase().trim(),
          name: name.trim(),
          isActive: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onAddRepo({
          id: data.data.id,
          projectKey: data.data.projectKey,
          slug: data.data.slug,
          name: data.data.name,
          isActive: data.data.isActive,
          defaultBranch,
          openPrCount: 0,
          lastSyncAt: new Date().toISOString(),
          createdAt: data.data.createdAt,
          updatedAt: data.data.updatedAt,
        });
        onOpenChange(false);
        toast.success(`Repositori ${projectKey}/${slug} Berhasil Dihubungkan!`, {
          description: "Repositori siap disinkronisasi melalui Bitbucket Server 8.19 REST API.",
        });
      } else {
        toast.error(data.message || "Gagal menghubungkan repositori.");
      }
    } catch (err) {
      console.error("Connect repo error:", err);
      toast.error("Terjadi kesalahan koneksi.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-semibold text-base">
                <Server className="size-4 text-primary" />
                Hubungkan Repositori Bitbucket Server
              </DialogTitle>
              <DialogDescription className="text-xs">
                Daftarkan proyek Bitbucket Server 8.19 agar event Pull Request dapat dipantau oleh AI Review Bot.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="connect-project-key" className="font-semibold text-foreground">
                    Project Key (Bitbucket)
                  </label>
                  <Input
                    id="connect-project-key"
                    placeholder="Contoh: FIN, CORE"
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value)}
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="connect-repo-slug" className="font-semibold text-foreground">
                    Repository Slug
                  </label>
                  <Input
                    id="connect-repo-slug"
                    placeholder="Contoh: payment-service"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="h-9 font-mono text-xs lowercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="connect-repo-name" className="font-semibold text-foreground">
                  Nama Deskriptif Repositori
                </label>
                <Input
                  id="connect-repo-name"
                  placeholder="Contoh: Financial Payment Gateway API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="connect-default-branch" className="font-semibold text-foreground">
                  Default Target Branch
                </label>
                <Input
                  id="connect-default-branch"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main / master"
                  className="h-9 font-mono text-xs"
                />
              </div>

              <div className="rounded border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                Sinkronisasi data menggunakan Bitbucket Server 8.19 REST API secara on-demand dan terprediksi.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button size="sm" type="submit" disabled={isTesting} className="gap-1.5 font-semibold">
              {isTesting ? "Memverifikasi API Bitbucket..." : "Uji & Hubungkan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
