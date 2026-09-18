"use client";

import * as React from "react";

import { CheckCircle2, GitBranch, GitPullRequest, LayoutGrid, List, Plus, Search, Server } from "lucide-react";
import { toast } from "sonner";

import { DashboardEmptyState } from "@/app/(main)/dashboard/_components/dashboard-empty-state";
import { dashboardTableStyles } from "@/app/(main)/dashboard/_components/dashboard-table-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Repository } from "@/data/code-review/types";

interface RepoGridProps {
  repositories: Repository[];
  onToggleActive?: (id: string, active: boolean) => void;
  onConnectNew?: () => void;
  onRefresh?: () => void;
}

export function RepoGrid({ repositories, onToggleActive, onConnectNew, onRefresh }: RepoGridProps) {
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [_togglingRepo, setTogglingRepo] = React.useState<string | null>(null);

  const filteredRepos = React.useMemo(() => {
    if (!search.trim()) return repositories;
    const q = search.toLowerCase();
    return repositories.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || r.projectKey.toLowerCase().includes(q),
    );
  }, [repositories, search]);

  const _handleToggleAutoReview = async (slug: string, currentStatus: boolean) => {
    setTogglingRepo(slug);
    try {
      const res = await fetch(`/api/repositories/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAutoReviewEnabled: !currentStatus }),
      });
      if (res.ok) {
        toast.success(`Automated review ${!currentStatus ? "diaktifkan" : "dinonaktifkan"} untuk ${slug}`);
        onRefresh?.();
      } else {
        toast.error("Gagal mengubah status automated review");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setTogglingRepo(null);
    }
  };

  if (repositories.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border bg-card p-6 shadow-xs">
        <DashboardEmptyState
          icon={Server}
          title="Belum Ada Repositori Terhubung"
          description="Database repositori kosong. Daftarkan repositori Bitbucket Server baru untuk mulai memantau pull request secara otomatis."
          action={
            onConnectNew && (
              <Button size="sm" onClick={onConnectNew} className="gap-1.5 font-semibold text-xs">
                <Plus className="size-3.5" />
                Hubungkan Repositori
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: Search & View Switcher */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Cari slug, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs"
          />
        </InputGroup>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="font-mono text-muted-foreground text-xs">{filteredRepos.length} repositori</span>
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("table")}
              title="Tampilan Tabel"
              className="size-7"
            >
              <List className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("grid")}
              title="Tampilan Grid"
              className="size-7"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={`w-[180px] ${dashboardTableStyles.th}`}>Proyek & Slug</TableHead>
                  <TableHead className={`min-w-[200px] ${dashboardTableStyles.th}`}>Nama Repositori</TableHead>
                  <TableHead className={`w-[140px] ${dashboardTableStyles.th}`}>Default Branch</TableHead>
                  <TableHead className={`w-[120px] ${dashboardTableStyles.th}`}>PR Terbuka</TableHead>
                  <TableHead className={`min-w-[170px] ${dashboardTableStyles.th}`}>Sinkronisasi Terakhir</TableHead>
                  <TableHead className={`w-[110px] ${dashboardTableStyles.th}`}>Status</TableHead>
                  <TableHead className={dashboardTableStyles.thStickyAction}>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8 text-center text-muted-foreground text-xs">
                      Tidak ditemukan repositori yang cocok dengan kata kunci &quot;{search}&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRepos.map((repo) => (
                    <TableRow key={repo.id} className="text-xs hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-muted/40 font-bold font-mono text-[11px]">
                            {repo.projectKey}
                          </Badge>
                          <span className="font-medium font-mono text-foreground">{repo.slug}</span>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-xs truncate font-medium text-muted-foreground">{repo.name}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                          <GitBranch className="size-3 shrink-0 text-primary" />
                          <span className="text-foreground">{repo.defaultBranch}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono">
                          <GitPullRequest className="size-3 shrink-0 text-primary" />
                          <span>{repo.openPrCount} PR</span>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {repo.lastSyncAt ? new Date(repo.lastSyncAt).toLocaleString("id-ID") : "-"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            repo.isActive
                              ? "border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                              : "border-muted bg-muted/40 text-[10px] text-muted-foreground"
                          }
                        >
                          {repo.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>

                      <TableCell className={dashboardTableStyles.tdStickyAction}>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={repo.isActive}
                            onCheckedChange={(checked) => {
                              onToggleActive?.(repo.id, checked);
                              toast.info(
                                `Status repositori ${repo.slug} diperbarui: ${checked ? "Aktif" : "Nonaktif"}`,
                              );
                            }}
                          />
                          <span className="text-[11px] text-muted-foreground">{repo.isActive ? "Aktif" : "Mati"}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRepos.map((repo) => (
            <Card
              key={repo.id}
              className="overflow-hidden border bg-card shadow-2xs transition-all hover:border-border/90"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 p-3.5 pb-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-muted/40 font-bold font-mono text-xs">
                    {repo.projectKey}
                  </Badge>
                  <h3 className="font-mono font-semibold text-foreground text-sm">{repo.slug}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{repo.isActive ? "Aktif" : "Nonaktif"}</span>
                  <Switch
                    checked={repo.isActive}
                    onCheckedChange={(checked) => {
                      onToggleActive?.(repo.id, checked);
                      toast.info(`Status repositori ${repo.slug} diperbarui: ${checked ? "Aktif" : "Nonaktif"}`);
                    }}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-3.5 text-xs">
                <p className="line-clamp-1 font-medium text-muted-foreground text-xs">{repo.name}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="space-y-0.5 rounded border bg-muted/40 p-2">
                    <span className="block text-[10px] text-muted-foreground">Default Branch</span>
                    <div className="flex items-center gap-1 font-medium font-mono text-foreground">
                      <GitBranch className="size-3 text-primary" />
                      {repo.defaultBranch}
                    </div>
                  </div>

                  <div className="space-y-0.5 rounded border bg-muted/40 p-2">
                    <span className="block text-[10px] text-muted-foreground">PR Terbuka</span>
                    <div className="flex items-center gap-1 font-medium font-mono text-foreground">
                      <GitPullRequest className="size-3 text-primary" />
                      {repo.openPrCount} Pull Request
                    </div>
                  </div>
                </div>

                <div className="space-y-1 border-border/60 border-t pt-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-500" />
                      Protokol:
                    </span>
                    <Badge
                      variant="outline"
                      className="border-indigo-500/30 bg-indigo-500/10 font-mono text-[10px] text-indigo-700 dark:text-indigo-400"
                    >
                      REST API 1.0 (Direct)
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground/80">
                    <span>Sinkronisasi Terakhir:</span>
                    <span>
                      {repo.lastSyncAt ? `${new Date(repo.lastSyncAt).toLocaleTimeString("id-ID")} WIB` : "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
