"use client";

import * as React from "react";

import { Bot, Globe, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Sparkles, Star, Trash2 } from "lucide-react";

import { DashboardPagination } from "@/app/(main)/dashboard/_components/dashboard-pagination";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AiProvider } from "@/server/db/settings";

interface AiProviderTableProps {
  providers: AiProvider[];
  onAddClick: () => void;
  onEditClick: (provider: AiProvider) => void;
  onSetDefault: (providerId: string) => Promise<void>;
  onDeleteClick: (providerId: string) => Promise<void>;
  onTestConnection: (provider: AiProvider) => Promise<void>;
  testingProviderId?: string | null;
}

export function AiProviderTable({
  providers,
  onAddClick,
  onEditClick,
  onSetDefault,
  onDeleteClick,
  onTestConnection,
  testingProviderId,
}: AiProviderTableProps) {
  // Search and pagination state
  const [search, setSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  // Sort providers so default is first, then apply search filter
  const filteredAndSortedProviders = React.useMemo(() => {
    let list = [...providers].sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.baseUrl.toLowerCase().includes(q) ||
          p.models.some((m) => m.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [providers, search]);

  const totalItems = filteredAndSortedProviders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedProviders = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedProviders.slice(start, start + pageSize);
  }, [filteredAndSortedProviders, currentPage, pageSize]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
      {providers.length === 0 ? (
        <div className="space-y-3 p-8 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-sm">Belum ada Provider AI yang terdaftar</p>
            <p className="mx-auto max-w-sm text-muted-foreground text-xs">
              Tambahkan provider AI pertama untuk mengaktifkan fitur automated code review.
            </p>
          </div>
          <Button size="sm" onClick={onAddClick} className="gap-1.5 text-xs">
            <Plus className="size-3.5" />
            Tambah Provider AI
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                <h3 className="font-semibold text-base text-foreground">Daftar Provider AI</h3>
                <Badge variant="secondary" className="font-mono text-xs">
                  {totalItems}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                Kelola penyedia LLM eksternal (OpenAI, DeepSeek, Ollama, vLLM) untuk pemindaian dan evaluasi kode.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              {providers.length > 3 && (
                <InputGroup className="w-48 sm:w-56">
                  <InputGroupAddon>
                    <Search className="size-3.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="Cari provider / model..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 text-xs"
                  />
                </InputGroup>
              )}
              <Button size="sm" onClick={onAddClick} className="h-8 shrink-0 gap-1.5 font-semibold text-xs shadow-xs">
                <Plus className="size-3.5" />
                Tambah Provider AI
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs hover:bg-transparent">
                  <TableHead className="w-[200px] text-left">Nama Provider</TableHead>
                  <TableHead className="min-w-[220px] text-left">Endpoint Base URL</TableHead>
                  <TableHead className="min-w-[240px] text-left">Pilihan Model AI (Sering Dipakai)</TableHead>
                  <TableHead className="w-[120px] text-left">Status</TableHead>
                  <TableHead className="sticky right-0 z-20 w-[130px] border-l bg-card/95 text-left shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] backdrop-blur-xs">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProviders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-8 text-center text-muted-foreground text-xs">
                      Tidak ditemukan provider AI yang cocok dengan kata kunci &quot;{search}&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProviders.map((p) => {
                    const isTestingThis = testingProviderId === p.id;

                    // Sort models by usage frequency descending (frequently used models first)
                    const sortedModels = [...p.models].sort((m1, m2) => {
                      const usage1 = p.modelUsage?.[m1] || 0;
                      const usage2 = p.modelUsage?.[m2] || 0;
                      if (usage2 !== usage1) return usage2 - usage1;
                      if (m1 === p.defaultModel) return -1;
                      if (m2 === p.defaultModel) return 1;
                      return m1.localeCompare(m2);
                    });

                    return (
                      <TableRow key={p.id} className="text-xs transition-colors hover:bg-muted/40">
                        {/* Name & Default Tag */}
                        <TableCell className="align-middle font-medium">
                          <div className="flex items-center gap-2">
                            {p.isDefault && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0 font-medium text-[10px] text-yellow-500"
                              >
                                <Star className="size-2.5 fill-yellow-500 text-yellow-500" />
                              </Badge>
                            )}
                            <span className="font-semibold text-foreground">{p.name}</span>
                          </div>
                        </TableCell>

                        {/* Endpoint Base URL */}
                        <TableCell className="align-middle">
                          <div className="flex max-w-[280px] items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground">
                            <Globe className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate" title={p.baseUrl}>
                              {p.baseUrl}
                            </span>
                          </div>
                        </TableCell>

                        {/* Models List (sorted by frequency) */}
                        <TableCell className="align-middle">
                          <div className="flex flex-wrap items-center gap-1">
                            {sortedModels.slice(0, 2).map((m, idx) => {
                              const isDef = m === p.defaultModel;
                              const count = p.modelUsage?.[m] || 0;
                              return (
                                <Badge
                                  key={m}
                                  variant={isDef ? "default" : "outline"}
                                  className={`gap-1 px-1.5 py-0 font-mono text-[10px] ${
                                    isDef
                                      ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20"
                                      : "bg-muted/40 text-foreground/80 hover:bg-muted/70"
                                  }`}
                                  title={`${m}${isDef ? " (Default Model)" : ""}${count > 0 ? ` - Digunakan ${count}x` : ""}`}
                                >
                                  {idx === 0 && count > 0 && (
                                    <Sparkles className="size-2.5 fill-amber-500 text-amber-500" />
                                  )}
                                  <span>{m}</span>
                                  {count > 0 && <span className="font-sans text-[9px] opacity-70">({count}x)</span>}
                                </Badge>
                              );
                            })}

                            {sortedModels.length > 3 && (
                              <Badge
                                variant="outline"
                                className="bg-muted/20 px-1.5 py-0 text-[10px] text-muted-foreground"
                                title={sortedModels.slice(3).join(", ")}
                              >
                                +{sortedModels.length - 3} lainnya
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-left align-middle">
                          <span className="inline-flex items-center gap-1.5 font-medium text-[11px] text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                            Siap Pakai
                          </span>
                        </TableCell>

                        {/* Actions (Sticky Column) */}
                        <TableCell className="sticky right-0 z-10 border-l bg-card/95 text-left align-middle shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] backdrop-blur-xs">
                          <div className="flex items-center justify-start gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => onTestConnection(p)}
                              disabled={isTestingThis}
                              title="Uji koneksi ke endpoint provider"
                            >
                              <RefreshCw className={`size-3.5 ${isTestingThis ? "animate-spin text-primary" : ""}`} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              onClick={() => onEditClick(p)}
                              title="Edit konfigurasi provider"
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                {!p.isDefault && (
                                  <DropdownMenuItem onClick={() => onSetDefault(p.id)} className="cursor-pointer gap-2">
                                    <Star className="size-3.5 text-amber-500" />
                                    Jadikan Provider Utama
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => onEditClick(p)} className="cursor-pointer gap-2">
                                  <Pencil className="size-3.5" />
                                  Edit Provider
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onTestConnection(p)} className="cursor-pointer gap-2">
                                  <RefreshCw className="size-3.5" />
                                  Uji Koneksi
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDeleteClick(p.id)}
                                  disabled={providers.length <= 1}
                                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                  Hapus Provider
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedProviders.length > 0 && (
            <DashboardPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20]}
              itemName="provider AI"
            />
          )}
        </>
      )}
    </div>
  );
}
