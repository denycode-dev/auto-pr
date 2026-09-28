"use client";

import * as React from "react";

import Link from "next/link";

import {
  BookOpen,
  Edit2,
  Eye,
  FileText,
  Globe,
  HardDrive,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { DashboardEmptyState } from "@/app/(main)/dashboard/_components/dashboard-empty-state";
import { DashboardPagination } from "@/app/(main)/dashboard/_components/dashboard-pagination";
import { dashboardTableStyles } from "@/app/(main)/dashboard/_components/dashboard-table-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export function SopsList({ sops, categories, repositories = [], onToggleEnabled, onDeleteSop }: SopsListProps) {
  const [viewingSop, setViewingSop] = React.useState<CodingSop | null>(null);

  // Filter & Search states
  const [search, setSearch] = React.useState("");
  const [scopeFilter, setScopeFilter] = React.useState<"ALL" | "GLOBAL" | "REPOSITORY">("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [repoFilter, setRepoFilter] = React.useState<string>("ALL");
  const [sortBy, setSortBy] = React.useState<"UPDATED_DESC" | "UPDATED_ASC" | "TITLE_ASC" | "TITLE_DESC">(
    "UPDATED_DESC",
  );

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const handleResetFilters = () => {
    setSearch("");
    setScopeFilter("ALL");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setRepoFilter("ALL");
    setSortBy("UPDATED_DESC");
    setCurrentPage(1);
  };

  // Collect available unique repositories for the filter dropdown
  const availableRepoOptions = React.useMemo(() => {
    const repoMap = new Map<string, { id: string; label: string }>();

    repositories.forEach((r) => {
      repoMap.set(r.id, {
        id: r.id,
        label: `${r.projectKey} / ${r.slug}`,
      });
    });

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
            sop.summary?.toLowerCase().includes(q) ||
            sop.rulesMarkdown?.toLowerCase().includes(q) ||
            sop.repositorySlug?.toLowerCase().includes(q) ||
            sop.projectKey?.toLowerCase().includes(q)
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

  const totalItems = filteredSops.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedSops = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSops.slice(start, start + pageSize);
  }, [filteredSops, currentPage, pageSize]);

  const _totalGlobalAll = sops.filter((s) => (s.scope || "GLOBAL") === "GLOBAL").length;
  const _totalRepoAll = sops.filter((s) => s.scope === "REPOSITORY").length;
  const hasActiveFilters = Boolean(
    search || categoryFilter !== "ALL" || statusFilter !== "ALL" || repoFilter !== "ALL" || scopeFilter !== "ALL",
  );

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="w-full sm:w-64 lg:w-72">
              <InputGroup className="w-full">
                <InputGroupAddon>
                  <Search className="size-3.5" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Cari judul, kata kunci SOP..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 text-xs"
                />
              </InputGroup>
            </div>

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[160px] text-xs">
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

            {/* Repository Filter (only if scope is not GLOBAL) */}
            {scopeFilter !== "GLOBAL" && (
              <Select
                value={repoFilter}
                onValueChange={(val) => {
                  setRepoFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[180px] text-xs">
                  <SelectValue placeholder="Semua Repositori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    Semua Repositori
                  </SelectItem>
                  {availableRepoOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="font-mono text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "ALL" | "ENABLED" | "DISABLED");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs">
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

          {/* Right Action & Info */}
          <div className="flex shrink-0 items-center gap-2 self-end lg:self-center">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 gap-1 px-2 text-muted-foreground text-xs hover:text-foreground"
                title="Reset semua filter"
              >
                <RotateCcw className="size-3" />
                Reset Filter
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`w-[260px] ${dashboardTableStyles.th}`}>Judul SOP</TableHead>
                <TableHead className={`w-[140px] ${dashboardTableStyles.th}`}>Kategori</TableHead>
                <TableHead className={`w-[150px] ${dashboardTableStyles.th}`}>Scope / Target</TableHead>
                <TableHead className={`min-w-[240px] ${dashboardTableStyles.th}`}>Ringkasan Panduan</TableHead>
                <TableHead className={`w-[130px] ${dashboardTableStyles.th}`}>Terakhir Diubah</TableHead>
                <TableHead className={`w-[110px] ${dashboardTableStyles.th}`}>Status</TableHead>
                <TableHead className={dashboardTableStyles.thStickyAction}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                if (sops.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <DashboardEmptyState
                          icon={BookOpen}
                          title="Belum Ada Aturan Coding SOP"
                          description="Tambahkan panduan SOP pertama atau impor berkas Markdown untuk mulai menjalankan peninjauan otomatis berbasis aturan organisasi."
                          action={
                            <Button asChild size="sm" className="gap-1.5 font-semibold text-xs">
                              <Link href="/dashboard/sops/create">Tulis SOP Baru</Link>
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                if (filteredSops.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <DashboardEmptyState
                          icon={BookOpen}
                          title="Tidak Ada SOP yang Cocok"
                          description="Tidak ditemukan aturan dengan kata kunci atau filter saat ini. Coba sesuaikan opsi filter Anda."
                          action={
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleResetFilters}
                              className="h-8 gap-1.5 font-medium text-xs"
                            >
                              <RotateCcw className="size-3" />
                              Reset Filter
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                return paginatedSops.map((sop) => {
                  const isRepoScope = sop.scope === "REPOSITORY";
                  let repoName = "Khusus Repositori";
                  if (sop.projectKey && sop.repositorySlug) {
                    repoName = `${sop.projectKey}/${sop.repositorySlug}`;
                  } else if (sop.repository) {
                    repoName = `${sop.repository.projectKey}/${sop.repository.slug}`;
                  }

                  const categoryName =
                    typeof sop.category === "string"
                      ? sop.category
                      : (sop.category?.name ?? sop.categoryName ?? "Umum");

                  const categoryColor =
                    typeof sop.category === "object" && sop.category?.colorBadge
                      ? getBadgeColor(sop.category.colorBadge)
                      : getBadgeColor(undefined);

                  return (
                    <TableRow key={sop.id} className="text-xs hover:bg-muted/30">
                      {/* Judul SOP */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingSop(sop)}
                            className="line-clamp-1 cursor-pointer text-left font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {sop.title}
                          </button>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                            <FileText className="size-3 shrink-0 text-primary/70" />
                            <span>ID: {sop.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Kategori */}
                      <TableCell>
                        <Badge variant="outline" className="gap-1.5 font-medium text-[11px]">
                          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor }} />
                          <span className="max-w-[90px] truncate">{categoryName}</span>
                        </Badge>
                      </TableCell>

                      {/* Scope / Target */}
                      <TableCell>
                        {isRepoScope ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-primary/30 font-mono text-[10px] text-primary"
                          >
                            <HardDrive className="size-2.5 shrink-0" />
                            <span className="max-w-[110px] truncate">{repoName}</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 font-mono text-[10px] text-muted-foreground">
                            <Globe className="size-2.5 shrink-0" />
                            Global
                          </Badge>
                        )}
                      </TableCell>

                      {/* Ringkasan Panduan */}
                      <TableCell>
                        <p className="line-clamp-2 max-w-sm text-muted-foreground text-xs leading-relaxed">
                          {sop.summary || sop.rulesMarkdown?.slice(0, 120) || "Tidak ada deskripsi ringkas."}
                        </p>
                      </TableCell>

                      {/* Terakhir Diubah */}
                      <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {new Date(sop.updatedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>

                      {/* Status Toggle */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sop.isEnabled}
                            onCheckedChange={(checked) => {
                              onToggleEnabled(sop.id, checked);
                            }}
                          />
                          <span className="text-[11px] text-muted-foreground">{sop.isEnabled ? "Aktif" : "Mati"}</span>
                        </div>
                      </TableCell>

                      {/* Sticky Action Column */}
                      <TableCell className={dashboardTableStyles.tdStickyAction}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingSop(sop)}
                            className="h-7 gap-1 border-primary/30 px-2 font-medium text-primary text-xs hover:bg-primary/10"
                            title="Lihat SOP"
                          >
                            <Eye className="size-3.5" />
                            Lihat
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" className="size-7 text-muted-foreground">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/sops/${sop.id}/edit`} className="cursor-pointer gap-2">
                                  <Edit2 className="size-3.5" />
                                  Edit Aturan SOP
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteSop(sop.id, sop.title)}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                                Hapus SOP
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {filteredSops.length > 0 && (
          <DashboardPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 20, 50]}
            itemName="SOP"
          />
        )}
      </div>

      {/* Modal Dialog for viewing SOP Markdown content */}
      <SopViewDialog
        sop={viewingSop}
        open={Boolean(viewingSop)}
        onOpenChange={(open) => {
          if (!open) setViewingSop(null);
        }}
      />
    </div>
  );
}
