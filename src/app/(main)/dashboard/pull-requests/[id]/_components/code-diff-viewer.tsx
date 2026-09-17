"use client";

import * as React from "react";

import { AlertCircle, FileCode, FilePlus, FileX, Layers, Search } from "lucide-react";

import { ShikiCodeView } from "@/components/code/shiki-code-view";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParsedDiffFile, PullRequest } from "@/data/code-review/types";

interface CodeDiffViewerProps {
  pr: PullRequest;
  onTriggerReview?: () => void;
}

export function CodeDiffViewer({ pr }: CodeDiffViewerProps) {
  const [files, setFiles] = React.useState<ParsedDiffFile[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  React.useEffect(() => {
    let isMounted = true;

    async function fetchDiff() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pull-requests/${pr.id}/diff`);
        const data = await res.json();

        if (!isMounted) return;

        const filesData: ParsedDiffFile[] = data?.data?.files ?? data?.files ?? [];

        if (res.ok && data.success && Array.isArray(filesData)) {
          setFiles(filesData);
          if (filesData.length > 0) {
            setSelectedFilePath(filesData[0].filePath);
          }
        } else {
          setError(data.message || "Gagal memuat potongan diff kode.");
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Diff fetch error:", err);
        setError("Terjadi kesalahan koneksi saat memuat diff.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void fetchDiff();

    return () => {
      isMounted = false;
    };
  }, [pr.id]);

  const filteredFiles = React.useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(
      (f) =>
        f.filePath.toLowerCase().includes(q) ||
        f.newPath?.toLowerCase().includes(q) ||
        f.oldPath?.toLowerCase().includes(q),
    );
  }, [files, searchQuery]);

  const activeFile = React.useMemo(() => {
    return files.find((f) => f.filePath === selectedFilePath) ?? files[0] ?? null;
  }, [files, selectedFilePath]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <div className="w-full space-y-3 lg:w-[280px]">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="w-full flex-1 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="mx-auto mb-2 size-8 text-destructive" />
        <h4 className="font-semibold text-foreground text-sm">Gagal Menampilkan Diff</h4>
        <p className="mt-1 text-muted-foreground text-xs">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/20 p-12 text-center text-muted-foreground text-xs">
        Tidak ada perbedaan berkas pada Pull Request ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Diff Layout: Left Files Pane (280px) + Right Focused Diff Viewer (Flex-1) */}
      <div className="flex flex-col items-start gap-5 lg:flex-row">
        {/* LEFT PANE (280px): Changed Files List (Fokus Berkas) */}
        <div className="w-full shrink-0 space-y-3 lg:sticky lg:top-28 lg:w-[280px]">
          <div className="space-y-3 rounded-xl border bg-card p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <Layers className="size-4 text-primary" />
                <span>Daftar Berkas ({files.length})</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                +{files.reduce((a, c) => a + c.additions, 0)} -{files.reduce((a, c) => a + c.deletions, 0)}
              </span>
            </div>

            {/* Search files */}
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama berkas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 bg-muted/30 pl-8 text-xs"
              />
            </div>

            {/* File list items */}
            <ScrollArea className="-mx-1 h-[520px] px-1">
              <div className="space-y-1">
                {filteredFiles.map((file, fileIdx) => {
                  const isSelected = activeFile?.filePath === file.filePath;
                  const parts = file.filePath.split("/");
                  const filename = parts.pop() ?? file.filePath;
                  const dir = parts.join("/");

                  return (
                    <button
                      key={`${file.filePath}-${fileIdx}`}
                      type="button"
                      onClick={() => setSelectedFilePath(file.filePath)}
                      className={`flex w-full flex-col gap-1 rounded-lg border p-2 text-left transition-all ${
                        isSelected
                          ? "border-primary/40 bg-primary/10 shadow-2xs"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate font-mono font-semibold text-foreground text-xs" title={filename}>
                          {filename}
                        </span>
                        {file.totalIssues > 0 && (
                          <Badge variant="destructive" className="h-4 shrink-0 px-1 font-mono text-[10px]">
                            {file.totalIssues}
                          </Badge>
                        )}
                      </div>

                      {dir && (
                        <span className="truncate font-mono text-[10px] text-muted-foreground" title={dir}>
                          {dir}
                        </span>
                      )}

                      <div className="flex items-center justify-between pt-0.5 font-mono text-[10px] text-muted-foreground">
                        <span className="capitalize">{file.status.toLowerCase()}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-600">+{file.additions}</span>
                          <span className="text-rose-600">-{file.deletions}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* RIGHT PANE (Flex-1): Pure Shiki Diff Viewer */}
        <div className="w-full min-w-0 flex-1">
          {activeFile ? (
            <div className="space-y-3 overflow-hidden rounded-lg border bg-background p-4 shadow-xs">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  {activeFile.status === "ADDED" ? (
                    <FilePlus className="size-4 shrink-0 text-emerald-600" />
                  ) : activeFile.status === "DELETED" ? (
                    <FileX className="size-4 shrink-0 text-rose-600" />
                  ) : (
                    <FileCode className="size-4 shrink-0 text-primary" />
                  )}
                  <span className="truncate font-mono font-semibold text-foreground" title={activeFile.filePath}>
                    {activeFile.filePath}
                  </span>
                  <Badge variant="outline" className="px-1.5 py-0 font-mono text-[10px] uppercase">
                    {activeFile.status}
                  </Badge>
                </div>

                <div className="flex shrink-0 items-center gap-3 font-mono text-xs">
                  <span className="font-semibold text-emerald-600">+{activeFile.additions}</span>
                  <span className="font-semibold text-rose-600">-{activeFile.deletions}</span>
                  {activeFile.totalIssues > 0 && (
                    <Badge variant="destructive" className="gap-1 px-1.5 py-0 font-mono text-[10px]">
                      <AlertCircle className="size-3" />
                      {activeFile.totalIssues} Temuan AI
                    </Badge>
                  )}
                </div>
              </div>

              {/* Pure Shiki Diff View */}
              {activeFile.diffText ? (
                <ShikiCodeView
                  code={activeFile.diffText}
                  lang="diff"
                  title={`${activeFile.filePath} (Unified Diff)`}
                  maxHeight="700px"
                />
              ) : (
                <div className="p-12 text-center text-muted-foreground text-xs italic">
                  Tidak ada perubahan teks diff yang dapat ditampilkan untuk berkas ini.
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs">
              Pilih berkas dari daftar di samping untuk melihat diff.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
