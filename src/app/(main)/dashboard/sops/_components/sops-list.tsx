"use client";

import * as React from "react";

import Link from "next/link";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  FileText,
  FolderGit2,
  Globe,
  HardDrive,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CodingSop, Repository, SopCategory } from "@/data/code-review/types";

import { SopViewDialog } from "./sop-view-dialog";

const COLOR_BADGE_MAP: Record<string, string> = {
  indigo: "#6366f1",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  purple: "#a855f7",
  slate: "#64748b",
};

function getBadgeColor(colorBadge?: string | null): string {
  return COLOR_BADGE_MAP[colorBadge ?? "indigo"] ?? "#6366f1";
}

interface SopsListProps {
  sops: CodingSop[];
  categories: SopCategory[];
  repositories?: Repository[];
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDeleteSop: (id: string, title: string) => void;
}

interface SopCardItemProps {
  sop: CodingSop;
  onView: (sop: CodingSop) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDeleteSop: (id: string, title: string) => void;
  showRepoBadge?: boolean;
}

function SopCardItem({ sop, onView, onToggleEnabled, onDeleteSop, showRepoBadge = false }: SopCardItemProps) {
  const isRepoScope = sop.scope === "REPOSITORY";
  let repoName = "Khusus Repositori";
  if (sop.projectKey && sop.repositorySlug) {
    repoName = `${sop.projectKey}/${sop.repositorySlug}`;
  } else if (sop.repository) {
    repoName = `${sop.repository.projectKey}/${sop.repository.slug}`;
  }

  const categoryName =
    typeof sop.category === "string" ? sop.category : (sop.category?.name ?? sop.categoryName ?? "Umum");

  return (
    <Card className="shadow-2xs overflow-hidden border bg-card hover:border-border/90 transition-all">
      <CardHeader className="p-3.5 pb-2.5 bg-muted/20 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <FileText className="size-4 text-primary shrink-0" />
          <h4>
            <button
              type="button"
              onClick={() => onView(sop)}
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors cursor-pointer text-left"
            >
              {sop.title}
            </button>
          </h4>

          {/* Scope badge */}
          {showRepoBadge &&
            (isRepoScope ? (
              <Badge variant="outline" className="text-[10px] font-mono gap-1 border-primary/30 text-primary">
                <HardDrive className="size-2.5" />
                {repoName}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-mono gap-1 text-muted-foreground">
                <Globe className="size-2.5" />
                Global
              </Badge>
            ))}

          {/* Category badge */}
          {typeof sop.category === "object" && sop.category !== null ? (
            <Badge variant="outline" className="text-[10px] font-medium gap-1">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: getBadgeColor(sop.category.colorBadge) }}
              />
              {sop.category.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-medium gap-1">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: getBadgeColor(undefined) }} />
              {categoryName}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(sop)}
            className="h-7 px-2.5 text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
          >
            <Eye className="size-3.5" />
            Lihat SOP
          </Button>

          <div className="flex items-center gap-1.5 text-xs border-l pl-2">
            <span className="text-muted-foreground text-[11px]">{sop.isEnabled ? "Aktif" : "Nonaktif"}</span>
            <Switch
              checked={sop.isEnabled}
              onCheckedChange={(checked) => {
                onToggleEnabled(sop.id, checked);
              }}
            />
          </div>

          <div className="flex items-center gap-1 border-l pl-2">
            <Button variant="ghost" size="icon-sm" asChild className="size-7" title="Edit SOP">
              <Link href={`/dashboard/sops/${sop.id}/edit`}>
                <Edit2 className="size-3" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDeleteSop(sop.id, sop.title)}
              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Hapus SOP"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2.5">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {sop.summary ?? "Aturan kepatuhan coding standar untuk menjaga kualitas dan arsitektur kode."}
        </p>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
          <span>
            Dibuat oleh: <strong className="text-foreground">{sop.createdBy}</strong>
          </span>
          <span>
            Terakhir diperbarui:{" "}
            {new Date(sop.updatedAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SopsList({ sops, categories, repositories = [], onToggleEnabled, onDeleteSop }: SopsListProps) {
  const [search, setSearch] = React.useState("");
  const [scopeFilter, setScopeFilter] = React.useState<"ALL" | "GLOBAL" | "REPOSITORY">("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [repoFilter, setRepoFilter] = React.useState("ALL");
  const [sortBy, setSortBy] = React.useState<"UPDATED_DESC" | "UPDATED_ASC" | "TITLE_ASC" | "TITLE_DESC">(
    "UPDATED_DESC",
  );
  const [viewingSop, setViewingSop] = React.useState<CodingSop | null>(null);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  // Reset filters helper
  const handleResetFilters = () => {
    setSearch("");
    setScopeFilter("ALL");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setRepoFilter("ALL");
    setSortBy("UPDATED_DESC");
  };

  // Collect available unique repositories for the filter dropdown
  const availableRepoOptions = React.useMemo(() => {
    const repoMap = new Map<string, { id: string; label: string }>();

    // From repositories props
    repositories.forEach((r) => {
      repoMap.set(r.id, {
        id: r.id,
        label: `${r.projectKey} / ${r.slug}`,
      });
    });

    // Also from sops if any repo isn't in repositories prop
    sops.forEach((s) => {
      if (s.scope === "REPOSITORY") {
        const id = s.repositoryId || (s.projectKey && s.repositorySlug ? `${s.projectKey}/${s.repositorySlug}` : "");
        if (id && !repoMap.has(id)) {
          const label = s.projectKey && s.repositorySlug ? `${s.projectKey} / ${s.repositorySlug}` : id;
          repoMap.set(id, { id, label });
        }
      }
    });

    return Array.from(repoMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [repositories, sops]);

  // Main filter and sort pipeline
  const filteredSops = React.useMemo(() => {
    return sops
      .filter((sop) => {
        // Scope filter
        if (scopeFilter !== "ALL") {
          const sopScope = sop.scope ?? "GLOBAL";
          if (sopScope !== scopeFilter) return false;
        }

        // Status filter
        if (statusFilter === "ENABLED" && !sop.isEnabled) return false;
        if (statusFilter === "DISABLED" && sop.isEnabled) return false;

        // Category filter
        if (categoryFilter !== "ALL") {
          const catId = sop.categoryId ?? (typeof sop.category === "object" ? sop.category?.id : undefined);
          const catSlug = typeof sop.category === "string" ? sop.category : sop.category?.slug;
          if (catId !== categoryFilter && catSlug !== categoryFilter) {
            return false;
          }
        }

        // Repository filter (applies to repository-scoped SOPs)
        if (repoFilter !== "ALL") {
          if (sop.scope !== "REPOSITORY") {
            return false;
          }
          const matchesRepoId = sop.repositoryId === repoFilter;
          const matchesKeySlug =
            sop.projectKey && sop.repositorySlug && `${sop.projectKey}/${sop.repositorySlug}` === repoFilter;
          if (!matchesRepoId && !matchesKeySlug) {
            return false;
          }
        }

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            sop.title.toLowerCase().includes(q) ||
            (sop.summary && sop.summary.toLowerCase().includes(q)) ||
            (sop.rulesMarkdown && sop.rulesMarkdown.toLowerCase().includes(q)) ||
            (sop.repositorySlug && sop.repositorySlug.toLowerCase().includes(q)) ||
            (sop.projectKey && sop.projectKey.toLowerCase().includes(q))
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "UPDATED_DESC") {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortBy === "UPDATED_ASC") {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        if (sortBy === "TITLE_ASC") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "TITLE_DESC") {
          return b.title.localeCompare(a.title);
        }
        return 0;
      });
  }, [sops, scopeFilter, statusFilter, categoryFilter, repoFilter, search, sortBy]);

  // Separate into Global SOPs and Repository Groups
  const { globalSops, repoGroups, totalRepoSopsCount } = React.useMemo(() => {
    const globals: CodingSop[] = [];
    const groupMap = new Map<
      string,
      {
        key: string;
        projectKey: string;
        slug: string;
        name: string;
        sops: CodingSop[];
      }
    >();

    filteredSops.forEach((sop) => {
      if (sop.scope === "REPOSITORY") {
        const repoInfo = sop.repository || repositories.find((r) => r.id === sop.repositoryId);
        const projectKey = sop.projectKey || repoInfo?.projectKey || "REPO";
        const slug = sop.repositorySlug || repoInfo?.slug || "general";
        const key = sop.repositoryId || `${projectKey}/${slug}`;
        const name = repoInfo?.name || `${projectKey} / ${slug}`;

        const existing = groupMap.get(key);
        if (existing) {
          existing.sops.push(sop);
        } else {
          groupMap.set(key, {
            key,
            projectKey,
            slug,
            name,
            sops: [sop],
          });
        }
      } else {
        globals.push(sop);
      }
    });

    const groups = Array.from(groupMap.values()).sort((a, b) =>
      `${a.projectKey}/${a.slug}`.localeCompare(`${b.projectKey}/${b.slug}`),
    );

    const repoCount = groups.reduce((acc, g) => acc + g.sops.length, 0);

    return {
      globalSops: globals,
      repoGroups: groups,
      totalRepoSopsCount: repoCount,
    };
  }, [filteredSops, repositories]);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const collapseAll = () => {
    const updated: Record<string, boolean> = {};
    repoGroups.forEach((g) => {
      updated[g.key] = true;
    });
    setCollapsedGroups(updated);
  };

  const expandAll = () => {
    setCollapsedGroups({});
  };

  const totalGlobalAll = sops.filter((s) => (s.scope || "GLOBAL") === "GLOBAL").length;
  const totalRepoAll = sops.filter((s) => s.scope === "REPOSITORY").length;

  return (
    <div className="space-y-5">
      {/* Scope Filter Tabs & Search & Filters Panel */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs
            value={scopeFilter}
            onValueChange={(val) => setScopeFilter(val as "ALL" | "GLOBAL" | "REPOSITORY")}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-8 p-1 text-xs bg-muted/60">
              <TabsTrigger value="ALL" className="text-xs px-3">
                Semua ({sops.length})
              </TabsTrigger>
              <TabsTrigger value="GLOBAL" className="text-xs px-3 gap-1.5">
                <Globe className="size-3 text-muted-foreground" />
                Global ({totalGlobalAll})
              </TabsTrigger>
              <TabsTrigger value="REPOSITORY" className="text-xs px-3 gap-1.5">
                <HardDrive className="size-3 text-muted-foreground" />
                Per Repositori ({totalRepoAll})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs text-muted-foreground font-mono">{filteredSops.length} aturan ditemukan</span>
            {(search ||
              categoryFilter !== "ALL" ||
              statusFilter !== "ALL" ||
              repoFilter !== "ALL" ||
              scopeFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                title="Reset semua filter"
              >
                <RotateCcw className="size-3" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-3 border-t">
          {/* Search input */}
          <div className={`sm:col-span-2 ${scopeFilter === "GLOBAL" ? "lg:col-span-6" : "lg:col-span-4"}`}>
            <InputGroup className="w-full">
              <InputGroupAddon>
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Cari judul, kata kunci, ringkasan SOP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs h-8"
              />
            </InputGroup>
          </div>

          {/* Category Select */}
          <div className="lg:col-span-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua Kategori
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: getBadgeColor(cat.colorBadge) }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Repository Select (Visible when scope is ALL or REPOSITORY) */}
          {scopeFilter !== "GLOBAL" && (
            <div className="lg:col-span-2">
              <Select value={repoFilter} onValueChange={setRepoFilter}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Semua Repositori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Semua Repositori
                  </SelectItem>
                  {availableRepoOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs font-mono">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Select */}
          <div className="lg:col-span-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "ALL" | "ENABLED" | "DISABLED")}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua Status
                </SelectItem>
                <SelectItem value="ENABLED" className="text-xs">
                  Hanya Aktif
                </SelectItem>
                <SelectItem value="DISABLED" className="text-xs">
                  Hanya Nonaktif
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Select */}
          <div className="lg:col-span-2">
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as "UPDATED_DESC" | "UPDATED_ASC" | "TITLE_ASC" | "TITLE_DESC")}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UPDATED_DESC" className="text-xs">
                  Terbaru Diubah
                </SelectItem>
                <SelectItem value="UPDATED_ASC" className="text-xs">
                  Terlama Diubah
                </SelectItem>
                <SelectItem value="TITLE_ASC" className="text-xs">
                  Nama (A - Z)
                </SelectItem>
                <SelectItem value="TITLE_DESC" className="text-xs">
                  Nama (Z - A)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredSops.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center space-y-3">
          <BookOpen className="size-8 mx-auto text-muted-foreground/60" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-foreground">Tidak Ada Aturan Coding SOP yang Cocok</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tidak ditemukan aturan dengan filter saat ini. Ubah kata kunci pencarian atau sesuaikan opsi filter Anda.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-8 text-xs gap-1.5">
            <RotateCcw className="size-3" />
            Reset Filter
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: GLOBAL SOPS (Visible on ALL or GLOBAL tabs) */}
          {scopeFilter !== "REPOSITORY" && (
            <div className="space-y-3.5">
              {/* Section Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/70">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Globe className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">Global Coding SOP</h3>
                      <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0">
                        {globalSops.length} aturan
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Aturan standar umum organisasi yang berlaku untuk seluruh repositori & pull request.
                    </p>
                  </div>
                </div>
              </div>

              {/* Global SOPs Items */}
              {globalSops.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/10">
                  Tidak ada Global SOP yang cocok dengan kriteria filter saat ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {globalSops.map((sop) => (
                    <SopCardItem
                      key={sop.id}
                      sop={sop}
                      onView={setViewingSop}
                      onToggleEnabled={onToggleEnabled}
                      onDeleteSop={onDeleteSop}
                      showRepoBadge={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: REPOSITORY-SPECIFIC SOPS (Visible on ALL or REPOSITORY tabs) */}
          {scopeFilter !== "GLOBAL" && (
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/70">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <HardDrive className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">SOP Khusus Repositori</h3>
                      <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0">
                        {totalRepoSopsCount} aturan di {repoGroups.length} repositori
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Aturan spesifik per project/repositori yang diutamakan (override) di atas aturan Global.
                    </p>
                  </div>
                </div>

                {repoGroups.length > 1 && (
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={expandAll}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Bentangkan Semua
                    </Button>
                    <span className="text-border text-xs">|</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={collapseAll}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Ciutkan Semua
                    </Button>
                  </div>
                )}
              </div>

              {/* Repository Groups List */}
              {repoGroups.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/10">
                  Tidak ada SOP Khusus Repositori yang cocok dengan kriteria filter saat ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {repoGroups.map((group) => {
                    const isCollapsed = Boolean(collapsedGroups[group.key]);

                    return (
                      <Card key={group.key} className="rounded-xl border shadow-2xs overflow-hidden bg-card/60">
                        {/* Repository Header Banner */}
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(group.key)}
                          className="w-full text-left px-4 py-3 bg-muted/30 border-b flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="size-5 rounded flex items-center justify-center text-muted-foreground">
                              {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                            </span>

                            <FolderGit2 className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />

                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-mono text-xs font-semibold text-foreground">
                                {group.projectKey} / {group.slug}
                              </span>
                              {group.name && group.name !== `${group.projectKey} / ${group.slug}` && (
                                <span className="text-xs text-muted-foreground truncate">({group.name})</span>
                              )}
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono px-2 py-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
                              >
                                {group.sops.length} SOP
                              </Badge>
                            </div>
                          </div>

                          <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                            {isCollapsed ? "Klik untuk melihat SOP" : "Tutup grup"}
                          </span>
                        </button>

                        {/* SOP Items inside Repository Group */}
                        {!isCollapsed && (
                          <CardContent className="p-3.5 space-y-3 bg-muted/5">
                            {group.sops.map((sop) => (
                              <SopCardItem
                                key={sop.id}
                                sop={sop}
                                onView={setViewingSop}
                                onToggleEnabled={onToggleEnabled}
                                onDeleteSop={onDeleteSop}
                                showRepoBadge={false}
                              />
                            ))}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SOP View Modal */}
      <SopViewDialog
        sop={viewingSop}
        open={!!viewingSop}
        onOpenChange={(open) => {
          if (!open) setViewingSop(null);
        }}
      />
    </div>
  );
}
