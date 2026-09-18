"use client";

import * as React from "react";

import { CheckCircle2, DownloadCloud, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        const [repoRes, settingsRes] = await Promise.all([fetch("/api/repositories"), fetch("/api/settings")]);

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

    void loadData();
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[540px]">
        <div className="space-y-4 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-semibold text-base">
              <DownloadCloud className="size-4 text-primary" />
              Tarik Pull Request dari Bitbucket Server
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sistem akan memanggil REST API Bitbucket Server 8.19 untuk menarik PR yang aktif dan menyimpannya ke
              database antrean review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1 text-xs">
            {/* Target Scope */}
            <div className="space-y-1.5">
              <span className="font-semibold text-foreground">Target Penarikan PR</span>
              <div className="flex items-center gap-4 pt-0.5">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="syncTargetMode"
                    checked={syncTargetMode === "REPO"}
                    onChange={() => setSyncTargetMode("REPO")}
                    className="text-primary"
                  />
                  <span className="font-medium">Repositori Tertentu</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
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
                    <label htmlFor="select-existing-repo" className="font-medium text-[11px] text-muted-foreground">
                      Pilih dari Repositori Terdaftar (Opsional):
                    </label>
                    <select
                      id="select-existing-repo"
                      onChange={(e) => handleSelectExistingRepo(e.target.value)}
                      className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        -- Pilih repositori untuk mengisi otomatis --
                      </option>
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
                    <label htmlFor="sync-project-key" className="font-semibold text-[11px] text-foreground">
                      Project Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="sync-project-key"
                      type="text"
                      value={syncProjectKey}
                      onChange={(e) => setSyncProjectKey(e.target.value.toUpperCase())}
                      placeholder="TPE"
                      className="h-8 w-full rounded border border-input bg-background px-2.5 font-mono text-xs uppercase shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <span className="text-[10px] text-muted-foreground">Singkatan project (mis. TPE)</span>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="sync-repo-slug" className="font-semibold text-[11px] text-foreground">
                      Repository Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="sync-repo-slug"
                      type="text"
                      value={syncRepoSlug}
                      onChange={(e) => setSyncRepoSlug(e.target.value.toLowerCase())}
                      placeholder="hc-app-be"
                      className="h-8 w-full rounded border border-input bg-background px-2.5 font-mono text-xs lowercase shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <span className="text-[10px] text-muted-foreground">Slug repo (mis. hc-app-be)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Status PR */}
            <div className="space-y-1.5">
              <span className="font-semibold text-foreground">Filter Status PR</span>
              <div className="flex items-center gap-4 pt-0.5">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="prState"
                    checked={syncPrState === "OPEN"}
                    onChange={() => setSyncPrState("OPEN")}
                    className="text-primary"
                  />
                  <span>Hanya PR Terbuka (OPEN)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
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
            <div className="space-y-1.5 rounded-lg border bg-muted/60 p-3">
              <div className="flex items-center justify-between font-semibold text-[11px] text-foreground">
                <span>URL REST API Bitbucket Server yang akan dipanggil:</span>
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-bold font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                  GET
                </span>
              </div>
              <div className="break-all rounded border border-indigo-200/60 bg-background p-2.5 font-mono text-[11px] text-indigo-700 leading-relaxed shadow-2xs dark:border-indigo-800/40 dark:text-indigo-300">
                {bbUrl.trim()}/rest/api/1.0/projects/
                <strong className="font-bold text-foreground underline decoration-indigo-500">
                  {syncTargetMode === "ALL" ? "{PROJECT_KEY}" : syncProjectKey.trim().toUpperCase() || "PROJECT"}
                </strong>
                /repos/
                <strong className="font-bold text-foreground underline decoration-indigo-500">
                  {syncTargetMode === "ALL" ? "{REPO_SLUG}" : syncRepoSlug.trim().toLowerCase() || "repo"}
                </strong>
                /pull-requests?state={syncPrState}&limit=50
              </div>
              <p className="text-[10px] text-muted-foreground">
                Pastikan Project Key adalah singkatan project di Bitbucket (contoh: <strong>TPE</strong>), bukan nama
                slug repositori.
              </p>
            </div>

            {/* Sync Result Feedback */}
            {syncResult && (
              <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                <div className="flex items-center gap-2 font-semibold text-emerald-700 text-xs dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  <span>Sinkronisasi Selesai!</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="rounded border bg-background/80 p-2">
                    <span className="block text-[10px] text-muted-foreground">Total Ditarik</span>
                    <strong className="font-mono text-foreground text-sm">{syncResult.totalSynced}</strong>
                  </div>
                  <div className="rounded border bg-background/80 p-2">
                    <span className="block text-[10px] text-muted-foreground">PR Baru</span>
                    <strong className="font-mono text-emerald-600 text-sm dark:text-emerald-400">
                      +{syncResult.newCreated}
                    </strong>
                  </div>
                  <div className="rounded border bg-background/80 p-2">
                    <span className="block text-[10px] text-muted-foreground">Diperbarui</span>
                    <strong className="font-mono text-indigo-600 text-sm dark:text-indigo-400">
                      {syncResult.updatedCount}
                    </strong>
                  </div>
                </div>
              </div>
            )}
            {/* End of form controls */}
          </div>
        </div>

        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSyncing}>
            Tutup
          </Button>
          <Button size="sm" onClick={handleExecuteSync} disabled={isSyncing} className="gap-2 font-semibold shadow-xs">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
