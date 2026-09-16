"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, DownloadCloud, GitBranch, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Repository } from "@/data/code-review/types";

interface SyncPrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncSuccess?: () => void;
}

export function SyncPrDialog({ open, onOpenChange, onSyncSuccess }: SyncPrDialogProps) {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [syncTargetMode, setSyncTargetMode] = React.useState<"REPO" | "ALL">("REPO");
  const [syncProjectKey, setSyncProjectKey] = React.useState<string>("TPE");
  const [syncRepoSlug, setSyncRepoSlug] = React.useState<string>("hc-app-be");
  const [syncPrState, setSyncPrState] = React.useState<"OPEN" | "ALL">("OPEN");
  const [bbUrl, setBbUrl] = React.useState<string>("https://bitbucket.bri.co.id");
  const [syncResult, setSyncResult] = React.useState<{
    totalSynced: number;
    newCreated: number;
    updatedCount: number;
  } | null>(null);

  // Load repositories and Bitbucket base URL when dialog opens
  React.useEffect(() => {
    if (!open) {
      setSyncResult(null);
      return;
    }

    const loadData = async () => {
      try {
        const [repoRes, settingsRes] = await Promise.all([
          fetch("/api/repositories"),
          fetch("/api/settings"),
        ]);

        if (repoRes.ok) {
          const rJson = await repoRes.json();
          if (rJson.success && Array.isArray(rJson.data) && rJson.data.length > 0) {
            setRepositories(rJson.data);
            if (!syncProjectKey) setSyncProjectKey(rJson.data[0].projectKey || "TPE");
            if (!syncRepoSlug) setSyncRepoSlug(rJson.data[0].slug || "hc-app-be");
          }
        }

        if (settingsRes.ok) {
          const sJson = await settingsRes.json();
          if (sJson.success && sJson.data?.bitbucket?.baseUrl) {
            setBbUrl(sJson.data.bitbucket.baseUrl);
          }
        }
      } catch {
        // Ignored
      }
    };

    loadData();
  }, [open, syncProjectKey, syncRepoSlug]);

  const handleSelectExistingRepo = (repoId: string) => {
    const repo = repositories.find((r) => r.id === repoId);
    if (repo) {
      setSyncProjectKey(repo.projectKey);
      setSyncRepoSlug(repo.slug);
    }
  };

  const handleExecuteSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    const payload: { projectKey?: string; repositorySlug?: string; state: string } = {
      state: syncPrState,
    };

    if (syncTargetMode === "REPO") {
      const pKey = syncProjectKey.trim().toUpperCase();
      const slug = syncRepoSlug.trim().toLowerCase();

      if (!pKey || !slug) {
        toast.error("Project Key dan Repository Slug tidak boleh kosong.");
        setIsSyncing(false);
        return;
      }

      payload.projectKey = pKey;
      payload.repositorySlug = slug;
    }

    try {
      const res = await fetch("/api/bitbucket/sync-prs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSyncResult({
          totalSynced: data.data?.totalSynced || 0,
          newCreated: data.data?.newCreated || 0,
          updatedCount: data.data?.updatedCount || 0,
        });
        toast.success("Sinkronisasi PR Bitbucket Berhasil!", {
          description: data.message,
        });
        onSyncSuccess?.();
      } else {
        toast.error(data.message || "Gagal menarik Pull Request dari Bitbucket Server.");
      }
    } catch (err) {
      console.error("Manual sync error:", err);
      toast.error("Terjadi kesalahan koneksi saat menarik PR dari Bitbucket.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <DownloadCloud className="size-5 text-indigo-600 dark:text-indigo-400" />
            Tarik Pull Request dari Bitbucket Server
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sistem akan memanggil REST API Bitbucket Server 8.19 untuk menarik PR yang aktif dan menyimpannya ke database antrean review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Target Scope */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Target Penarikan PR</label>
            <div className="flex items-center gap-4 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="syncTargetMode"
                  checked={syncTargetMode === "REPO"}
                  onChange={() => setSyncTargetMode("REPO")}
                  className="text-primary"
                />
                <span className="font-medium">Repositori Tertentu</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="syncTargetMode"
                  checked={syncTargetMode === "ALL"}
                  onChange={() => setSyncTargetMode("ALL")}
                  className="text-primary"
                />
                <span>Semua Repositori Aktif ({repositories.length})</span>
              </label>
            </div>
          </div>

          {syncTargetMode === "REPO" && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              {repositories.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Pilih dari Repositori Terdaftar (Opsional):
                  </label>
                  <select
                    onChange={(e) => handleSelectExistingRepo(e.target.value)}
                    className="w-full h-8 rounded border border-input bg-background px-2.5 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Pilih repositori untuk mengisi otomatis --</option>
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.projectKey} / {repo.slug} ({repo.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground text-[11px]">
                    Project Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={syncProjectKey}
                    onChange={(e) => setSyncProjectKey(e.target.value.toUpperCase())}
                    placeholder="TPE"
                    className="w-full h-8 rounded border border-input bg-background px-2.5 font-mono text-xs shadow-xs uppercase focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <span className="text-[10px] text-muted-foreground">Singkatan project (mis. TPE)</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground text-[11px]">
                    Repository Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={syncRepoSlug}
                    onChange={(e) => setSyncRepoSlug(e.target.value.toLowerCase())}
                    placeholder="hc-app-be"
                    className="w-full h-8 rounded border border-input bg-background px-2.5 font-mono text-xs shadow-xs lowercase focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <span className="text-[10px] text-muted-foreground">Slug repo (mis. hc-app-be)</span>
                </div>
              </div>
            </div>
          )}

          {/* Filter Status PR */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Filter Status PR</label>
            <div className="flex items-center gap-4 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="prState"
                  checked={syncPrState === "OPEN"}
                  onChange={() => setSyncPrState("OPEN")}
                  className="text-primary"
                />
                <span>Hanya PR Terbuka (OPEN)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="prState"
                  checked={syncPrState === "ALL"}
                  onChange={() => setSyncPrState("ALL")}
                  className="text-primary"
                />
                <span>Semua Status PR (ALL)</span>
              </label>
            </div>
          </div>

          {/* Live REST API URL Preview */}
          <div className="rounded-lg border bg-muted/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
              <span>URL REST API Bitbucket Server yang akan dipanggil:</span>
              <span className="rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 font-mono text-[10px] font-bold">GET</span>
            </div>
            <div className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300 break-all bg-background p-2.5 rounded border border-indigo-200/60 dark:border-indigo-800/40 leading-relaxed shadow-2xs">
              {bbUrl.trim()}/rest/api/1.0/projects/
              <strong className="text-foreground underline decoration-indigo-500 font-bold">
                {syncTargetMode === "ALL" ? "{PROJECT_KEY}" : (syncProjectKey.trim().toUpperCase() || "PROJECT")}
              </strong>
              /repos/
              <strong className="text-foreground underline decoration-indigo-500 font-bold">
                {syncTargetMode === "ALL" ? "{REPO_SLUG}" : (syncRepoSlug.trim().toLowerCase() || "repo")}
              </strong>
              /pull-requests?state={syncPrState}&limit=50
            </div>
            <p className="text-[10px] text-muted-foreground">
              Pastikan Project Key adalah singkatan project di Bitbucket (contoh: <strong>TPE</strong>), bukan nama slug repositori.
            </p>
          </div>

          {/* Sync Result Feedback */}
          {syncResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="size-4" />
                <span>Sinkronisasi Selesai!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="bg-background/80 rounded p-2 border">
                  <span className="text-muted-foreground block text-[10px]">Total Ditarik</span>
                  <strong className="font-mono text-sm text-foreground">{syncResult.totalSynced}</strong>
                </div>
                <div className="bg-background/80 rounded p-2 border">
                  <span className="text-muted-foreground block text-[10px]">PR Baru</span>
                  <strong className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    +{syncResult.newCreated}
                  </strong>
                </div>
                <div className="bg-background/80 rounded p-2 border">
                  <span className="text-muted-foreground block text-[10px]">Diperbarui</span>
                  <strong className="font-mono text-sm text-indigo-600 dark:text-indigo-400">
                    {syncResult.updatedCount}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSyncing}
          >
            Tutup
          </Button>
          <Button
            size="sm"
            onClick={handleExecuteSync}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-xs"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                Menarik Data PR...
              </>
            ) : (
              <>
                <DownloadCloud className="size-3.5" />
                Tarik Pull Request Sekarang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
