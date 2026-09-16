"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clipboard,
  FileCode,
  FileDiff,
  FilePlus,
  FileX,
  Filter,
  Flame,
  Info,
  Layers,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParsedDiffFile, PullRequest, ReviewIssue } from "@/data/code-review/types";

interface CodeDiffViewerProps {
  pr: PullRequest;
  onTriggerReview?: () => void;
}

export function CodeDiffViewer({ pr, onTriggerReview }: CodeDiffViewerProps) {
  const [files, setFiles] = React.useState<ParsedDiffFile[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [viewMode, setViewMode] = React.useState<"SINGLE" | "ALL">("SINGLE");
  const [copiedFixId, setCopiedFixId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchDiff() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pull-requests/${pr.id}/diff`);
        const data = await res.json();

        if (!isMounted) return;

        // apiSuccess wraps payload in data.data: { files: [...] }
        const files: ParsedDiffFile[] = data?.data?.files ?? data?.files ?? [];

        if (res.ok && data.success && Array.isArray(files)) {
          setFiles(files);
          if (files.length > 0) {
            setSelectedFilePath(files[0].filePath);
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

    fetchDiff();

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
        f.oldPath?.toLowerCase().includes(q)
    );
  }, [files, searchQuery]);

  const activeFile = React.useMemo(() => {
    return files.find((f) => f.filePath === selectedFilePath) || files[0] || null;
  }, [files, selectedFilePath]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFixId(id);
    toast.success("Saran kode berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedFixId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 h-[620px] rounded-xl border bg-background/50 p-4">
        <div className="w-full lg:w-[280px] space-y-3 shrink-0">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[480px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="size-8 mx-auto text-destructive mb-2" />
        <h4 className="font-semibold text-sm text-foreground">Gagal Menampilkan Diff</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 text-xs"
          onClick={() => window.location.reload()}
        >
          Muat Ulang Halaman
        </Button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center">
        <FileDiff className="size-10 mx-auto text-muted-foreground/50 mb-3" />
        <h4 className="font-semibold text-sm text-foreground">Tidak Ada Perubahan Berkas</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          Pull request ini tidak memiliki baris perubahan berkas atau diff kosong.
        </p>
      </div>
    );
  }

  const renderIssueCard = (issue: ReviewIssue) => {
    const isCritical = issue.severity === "CRITICAL";
    const isHigh = issue.severity === "HIGH";
    const isMedium = issue.severity === "MEDIUM";

    return (
      <div
        key={issue.id}
        className={`my-2 mx-3 rounded-lg border shadow-sm overflow-hidden text-xs ${
          isCritical
            ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20"
            : isHigh
              ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20"
              : isMedium
                ? "border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-950/20"
                : "border-border bg-card"
        }`}
      >
        {/* Issue Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <div
              className={`p-1 rounded ${
                isCritical
                  ? "bg-rose-500/20 text-rose-600"
                  : isHigh
                    ? "bg-amber-500/20 text-amber-600"
                    : "bg-primary/20 text-primary"
              }`}
            >
              <Bot className="size-3.5" />
            </div>
            <span className="font-semibold text-foreground">Temuan AI Reviewer</span>
            <Badge
              variant={isCritical ? "destructive" : "outline"}
              className={`text-[10px] px-1.5 py-0 font-medium ${
                isHigh
                  ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                  : isMedium
                    ? "border-indigo-500/40 text-indigo-600 bg-indigo-500/10"
                    : ""
              }`}
            >
              {issue.severity}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              {issue.category}
            </Badge>
          </div>

          {issue.isPosted && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/30 gap-1">
              <Check className="size-2.5" />
              Tersinkron ke Bitbucket
            </Badge>
          )}
        </div>

        {/* Issue Body */}
        <div className="p-3 space-y-2.5">
          <div>
            <h5 className="font-semibold text-foreground text-xs">{issue.title}</h5>
            <p className="text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap font-sans">
              {issue.description}
            </p>
          </div>

          {issue.suggestedFix && (
            <div className="rounded-md border bg-zinc-950 p-2.5 text-zinc-200">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800 text-[11px] text-zinc-400">
                <span className="font-medium flex items-center gap-1.5">
                  <Sparkles className="size-3 text-amber-400" />
                  Saran Perbaikan Kode:
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(issue.suggestedFix || "", issue.id)}
                  className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1"
                >
                  {copiedFixId === issue.id ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Clipboard className="size-3" />
                      Salin Kode
                    </>
                  )}
                </Button>
              </div>
              <pre className="font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                {issue.suggestedFix}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFileDiff = (file: ParsedDiffFile) => {
    return (
      <div key={file.filePath} className="rounded-lg border overflow-hidden bg-background mb-6 shadow-xs">
        {/* File Header Bar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-muted/60 px-4 py-2.5 backdrop-blur-sm text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {file.status === "ADDED" ? (
              <FilePlus className="size-4 text-emerald-600 shrink-0" />
            ) : file.status === "DELETED" ? (
              <FileX className="size-4 text-rose-600 shrink-0" />
            ) : (
              <FileCode className="size-4 text-primary shrink-0" />
            )}
            <span className="font-mono font-semibold text-foreground truncate" title={file.filePath}>
              {file.filePath}
            </span>
            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 uppercase">
              {file.status}
            </Badge>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
            <span className="text-emerald-600 font-semibold">+{file.additions}</span>
            <span className="text-rose-600 font-semibold">-{file.deletions}</span>
            {file.totalIssues > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                <AlertCircle className="size-3" />
                {file.totalIssues} Isu AI
              </Badge>
            )}
          </div>
        </div>

        {/* Hunks & Lines */}
        <div className="overflow-x-auto font-mono text-[12px] divide-y divide-border/40">
          {file.hunks.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground italic font-sans">
              Berkas binary atau tidak ada perubahan baris teks yang dapat ditampilkan.
            </div>
          ) : (
            file.hunks.map((hunk, hIdx) => (
              <div key={hIdx}>
                {/* Hunk Header */}
                <div className="bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground select-none font-mono flex items-center gap-2">
                  <span className="text-primary/70">@@</span>
                  <span>{hunk.header}</span>
                </div>

                {/* Lines */}
                <div className="divide-y divide-border/15">
                  {hunk.lines.map((line, lIdx) => {
                    const isAdded = line.type === "ADDED";
                    const isDeleted = line.type === "DELETED";

                    return (
                      <React.Fragment key={lIdx}>
                        <div
                          className={`flex items-stretch group transition-colors leading-relaxed ${
                            isAdded
                              ? "bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 border-l-2 border-emerald-500"
                              : isDeleted
                                ? "bg-rose-500/10 text-rose-950 dark:text-rose-200 border-l-2 border-rose-500"
                                : "hover:bg-muted/40 text-foreground"
                          }`}
                        >
                          {/* Old Line Number */}
                          <div className="w-12 shrink-0 py-0.5 px-1.5 text-right text-[11px] text-muted-foreground/60 select-none bg-muted/10 border-r border-border/30">
                            {line.oldLine ?? ""}
                          </div>

                          {/* New Line Number */}
                          <div className="w-12 shrink-0 py-0.5 px-1.5 text-right text-[11px] text-muted-foreground/60 select-none bg-muted/10 border-r border-border/30">
                            {line.newLine ?? ""}
                          </div>

                          {/* Prefix marker */}
                          <div className="w-6 shrink-0 py-0.5 text-center text-[11px] select-none font-bold opacity-70">
                            {isAdded ? "+" : isDeleted ? "-" : " "}
                          </div>

                          {/* Line Content */}
                          <div className="flex-1 py-0.5 px-2 overflow-x-auto whitespace-pre">
                            {line.content || " "}
                          </div>
                        </div>

                        {/* Inline Issue Comment Cards directly beneath this line */}
                        {line.inlineIssues && line.inlineIssues.length > 0 && (
                          <div className="bg-background/95 border-y border-border/60 py-2">
                            {line.inlineIssues.map((issue: ReviewIssue) => renderIssueCard(issue))}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start">
      {/* LEFT PANE (280px): Changed Files List (Sticky) */}
      <div className="w-full lg:w-[280px] shrink-0 space-y-3 lg:sticky lg:top-28">
        <div className="rounded-xl border bg-card p-3 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Layers className="size-4 text-primary" />
              <span>Daftar Berkas ({files.length})</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              +{files.reduce((a, c) => a + c.additions, 0)} -{files.reduce((a, c) => a + c.deletions, 0)}
            </span>
          </div>

          {/* Search files */}
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama berkas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-md border p-0.5 bg-muted/40 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("SINGLE")}
              className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                viewMode === "SINGLE" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              Fokus Berkas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ALL")}
              className={`flex-1 py-1 rounded text-center font-medium transition-all ${
                viewMode === "ALL" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              Semua Diff
            </button>
          </div>

          {/* File list items */}
          <ScrollArea className="h-[480px] -mx-1 px-1">
            <div className="space-y-1">
              {filteredFiles.map((file, fileIdx) => {
                const isSelected = selectedFilePath === file.filePath && viewMode === "SINGLE";
                const parts = file.filePath.split("/");
                const filename = parts.pop() || file.filePath;
                const dir = parts.join("/");

                return (
                  <button
                    key={`${file.filePath}-${fileIdx}`}
                    type="button"
                    onClick={() => {
                      setSelectedFilePath(file.filePath);
                      if (viewMode === "ALL") {
                        // Scroll to element
                        const el = document.getElementById(`diff-file-${encodeURIComponent(file.filePath)}`);
                        el?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={`w-full text-left rounded-lg p-2 transition-all flex flex-col gap-1 border ${
                      isSelected
                        ? "bg-primary/10 border-primary/40 shadow-2xs"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs font-semibold text-foreground truncate" title={filename}>
                        {filename}
                      </span>
                      {file.totalIssues > 0 && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] h-4 px-1 font-mono shrink-0"
                        >
                          {file.totalIssues}
                        </Badge>
                      )}
                    </div>

                    {dir && (
                      <span className="text-[10px] font-mono text-muted-foreground truncate" title={dir}>
                        {dir}
                      </span>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono pt-0.5 text-muted-foreground">
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

      {/* RIGHT PANE (Flex-1): Code Diff Viewer */}
      <div className="flex-1 w-full min-w-0">
        {viewMode === "SINGLE" ? (
          activeFile ? (
            renderFileDiff(activeFile)
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">Pilih berkas dari daftar di samping.</div>
          )
        ) : (
          filteredFiles.map((file, fileIdx) => (
            <div key={`${file.filePath}-${fileIdx}`} id={`diff-file-${encodeURIComponent(file.filePath)}`}>
              {renderFileDiff(file)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
