"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Edit2,
  FileText,
  Globe,
  HardDrive,
  Search,
  Trash2,
} from "lucide-react";

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
  return COLOR_BADGE_MAP[colorBadge || "indigo"] || "#6366f1";
}
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CodingSop, SopCategory } from "@/data/code-review/types";

interface SopsListProps {
  sops: CodingSop[];
  categories: SopCategory[];
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDeleteSop: (id: string, title: string) => void;
}

export function SopsList({
  sops,
  categories,
  onToggleEnabled,
  onDeleteSop,
}: SopsListProps) {
  const [search, setSearch] = React.useState("");
  const [scopeFilter, setScopeFilter] = React.useState<"ALL" | "GLOBAL" | "REPOSITORY">("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  const filteredSops = React.useMemo(() => {
    return sops.filter((sop) => {
      // Scope filter
      if (scopeFilter !== "ALL") {
        const sopScope = sop.scope || "GLOBAL";
        if (sopScope !== scopeFilter) return false;
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        const catId = sop.categoryId || (typeof sop.category === "object" ? sop.category?.id : undefined);
        const catSlug = typeof sop.category === "string" ? sop.category : sop.category?.slug;
        if (catId !== categoryFilter && catSlug !== categoryFilter) {
          return false;
        }
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          sop.title.toLowerCase().includes(q) ||
          sop.rulesMarkdown.toLowerCase().includes(q) ||
          (sop.summary && sop.summary.toLowerCase().includes(q)) ||
          (sop.repositorySlug && sop.repositorySlug.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [sops, scopeFilter, categoryFilter, search]);

  return (
    <div className="space-y-4">
      {/* Scope Filter Tabs & Search & Category */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs
            value={scopeFilter}
            onValueChange={(val) => setScopeFilter(val as any)}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-8 p-1 text-xs bg-muted/60">
              <TabsTrigger value="ALL" className="text-xs px-2.5">
                Semua ({sops.length})
              </TabsTrigger>
              <TabsTrigger value="GLOBAL" className="text-xs px-2.5 gap-1">
                <Globe className="size-3" />
                Global ({sops.filter((s) => (s.scope || "GLOBAL") === "GLOBAL").length})
              </TabsTrigger>
              <TabsTrigger value="REPOSITORY" className="text-xs px-2.5 gap-1">
                <HardDrive className="size-3" />
                Khusus Repositori ({sops.filter((s) => s.scope === "REPOSITORY").length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <span className="text-xs text-muted-foreground font-mono self-end sm:self-center">
            {filteredSops.length} aturan ditemukan
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1 border-t">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Cari judul, ringkasan, atau isi aturan SOP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs h-8"
            />
          </InputGroup>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Kategori</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: getBadgeColor(cat.colorBadge) }}
                    />
                    <span>{cat.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of SOPs */}
      {filteredSops.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center">
          <BookOpen className="size-8 mx-auto text-muted-foreground/60 mb-3" />
          <h4 className="font-semibold text-sm text-foreground mb-1">
            Tidak Ada Aturan Coding SOP yang Cocok
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tidak ditemukan aturan dengan filter saat ini. Ubah kata kunci pencarian atau tambah SOP baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSops.map((sop) => {
            const isRepoScope = sop.scope === "REPOSITORY";

            return (
              <Card key={sop.id} className="shadow-xs overflow-hidden border">
                <CardHeader className="p-4 pb-2 bg-muted/20 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <FileText className="size-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm text-foreground">{sop.title}</h3>

                    {/* Scope badge */}
                    {isRepoScope ? (
                      <Badge variant="outline" className="text-[10px] font-mono gap-1 border-primary/30 text-primary">
                        <HardDrive className="size-2.5" />
                        {sop.projectKey && sop.repositorySlug
                          ? `${sop.projectKey}/${sop.repositorySlug}`
                          : "Repositori"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-mono gap-1 text-muted-foreground">
                        <Globe className="size-2.5" />
                        Global
                      </Badge>
                    )}

                    {/* Category badge */}
                    {sop.category && typeof sop.category === "object" ? (
                      <Badge variant="outline" className="text-[10px] font-medium gap-1">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: getBadgeColor(sop.category.colorBadge) }}
                        />
                        {sop.category.name}
                      </Badge>
                    ) : sop.categoryName ? (
                      <Badge variant="outline" className="text-[10px] font-medium gap-1">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: getBadgeColor(undefined) }}
                        />
                        {sop.categoryName}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {typeof sop.category === "string" ? sop.category : "Umum"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground text-[11px]">
                        {sop.isEnabled ? "Aktif" : "Nonaktif"}
                      </span>
                      <Switch
                        checked={sop.isEnabled}
                        onCheckedChange={(checked) => {
                          onToggleEnabled(sop.id, checked);
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1 border-l pl-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        asChild
                        className="size-7"
                        title="Edit SOP"
                      >
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

                <CardContent className="p-4 space-y-3">
                  {sop.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sop.summary}
                    </p>
                  )}

                  <div className="rounded-lg bg-muted/40 p-3 border font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto">
                    {sop.rulesMarkdown.trim()}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                    <span>
                      Dibuat oleh: <strong className="text-foreground">{sop.createdBy}</strong>
                    </span>
                    <span>
                      Terakhir diperbarui: {new Date(sop.updatedAt).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
