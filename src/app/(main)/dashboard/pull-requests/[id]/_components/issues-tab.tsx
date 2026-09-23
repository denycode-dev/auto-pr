"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  Ban,
  Check,
  CheckCircle2,
  EyeOff,
  FileCode,
  ListFilter,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { ShikiCodeView } from "@/components/code/shiki-code-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { detectLanguageFromPath, getSeverityConfig } from "@/data/code-review/severity-config";
import type { ReviewIssue } from "@/data/code-review/types";

interface IssuesTabProps {
  issues: ReviewIssue[];
  bitbucketPrId: number;
  prId?: string;
}

function cleanIssueDescription(desc?: string | null): string {
  if (!desc) return "";
  return desc.replace(/^[ \t]*📍[ \t]*\*{0,2}Lokasi:\*{0,2}[^\n]*(\r?\n)+/gim, "").trim();
}

export function IssuesTab({ issues, bitbucketPrId, prId }: IssuesTabProps) {
  const router = useRouter();
  const [issueList, setIssueList] = React.useState<ReviewIssue[]>(issues);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Filter states
  const [severityFilter, setSeverityFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Loading states
  const [loadingIssueId, setLoadingIssueId] = React.useState<string | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = React.useState(false);

  // Sync state if props change
  React.useEffect(() => {
    setIssueList(issues);
  }, [issues]);

  const targetPrId = prId ?? String(bitbucketPrId);

  // Filtered issues
  const filteredIssues = React.useMemo(() => {
    return issueList.filter((issue) => {
      if (severityFilter !== "ALL" && issue.severity !== severityFilter) return false;
      if (categoryFilter !== "ALL" && issue.category !== categoryFilter) return false;

      if (statusFilter === "VALID") {
        if (issue.isFalsePositive) return false;
      } else if (statusFilter === "FALSE_POSITIVE") {
        if (!issue.isFalsePositive) return false;
      } else if (statusFilter === "UNPOSTED") {
        if (issue.isPosted || issue.isFalsePositive) return false;
      } else if (statusFilter === "POSTED") {
        if (!issue.isPosted) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchFile = issue.filePath.toLowerCase().includes(q);
        const matchDesc = issue.description.toLowerCase().includes(q);
        if (!matchTitle && !matchFile && !matchDesc) return false;
      }

      return true;
    });
  }, [issueList, severityFilter, categoryFilter, statusFilter, searchQuery]);

  // Counts
  const counts = React.useMemo(() => {
    let validCount = 0;
    let falsePositiveCount = 0;
    let postedCount = 0;
    let unpostedValidCount = 0;

    for (const item of issueList) {
      if (item.isPosted) {
        postedCount++;
      }
      if (item.isFalsePositive) {
        falsePositiveCount++;
      } else {
        validCount++;
        if (!item.isPosted) {
          unpostedValidCount++;
        }
      }
    }

    return {
      total: issueList.length,
      valid: validCount,
      falsePositive: falsePositiveCount,
      posted: postedCount,
      unpostedValid: unpostedValidCount,
    };
  }, [issueList]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all filtered issues that are not false positive and not already posted
      const newSelected = new Set(selectedIds);
      filteredIssues.forEach((iss) => {
        if (!iss.isFalsePositive && !iss.isPosted) {
          newSelected.add(iss.id);
        }
      });
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (issueId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIds(newSelected);
  };

  // Toggle False Positive per issue
  const handleToggleFalsePositive = async (issue: ReviewIssue) => {
    const newStatus = !issue.isFalsePositive;
    setLoadingIssueId(issue.id);

    try {
      const res = await fetch(`/api/pull-requests/${targetPrId}/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: issue.id,
          isFalsePositive: newStatus,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIssueList((prev) => prev.map((i) => (i.id === issue.id ? { ...i, isFalsePositive: newStatus } : i)));

        if (newStatus && selectedIds.has(issue.id)) {
          const updated = new Set(selectedIds);
          updated.delete(issue.id);
          setSelectedIds(updated);
        }

        toast.success(
          newStatus ? "Temuan ditandai sebagai False Positive (diabaikan)" : "Temuan dikembalikan sebagai Valid",
        );
        router.refresh();
      } else {
        toast.error(data.message || "Gagal mengubah status temuan");
      }
    } catch (err) {
      console.error("Toggle false positive error:", err);
      toast.error("Terjadi kendala koneksi saat memperbarui status temuan.");
    } finally {
      setLoadingIssueId(null);
    }
  };

  // Post single issue to Bitbucket
  const handlePostSingleIssue = async (issue: ReviewIssue) => {
    setLoadingIssueId(issue.id);

    try {
      const res = await fetch(`/api/pull-requests/${targetPrId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: issue.id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIssueList((prev) => prev.map((i) => (i.id === issue.id ? { ...i, isPosted: true } : i)));

        const updated = new Set(selectedIds);
        updated.delete(issue.id);
        setSelectedIds(updated);

        toast.success("Komentar Berhasil Dikirim ke Bitbucket!", {
          description: `Temuan '${issue.title}' berhasil diposting sebagai inline comment di PR #${bitbucketPrId}.`,
        });
        router.refresh();
      } else {
        toast.error(data.message || "Gagal mengirim komentar ke Bitbucket");
      }
    } catch (err) {
      console.error("Post single issue error:", err);
      toast.error("Terjadi kendala koneksi saat mengirim komentar ke Bitbucket.");
    } finally {
      setLoadingIssueId(null);
    }
  };

  // Bulk post selected issues
  const handleBulkPost = async () => {
    const idsToPost = Array.from(selectedIds);
    if (idsToPost.length === 0) {
      toast.warning("Pilih setidaknya 1 temuan issue yang valid untuk dikirim.");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const res = await fetch(`/api/pull-requests/${targetPrId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueIds: idsToPost }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const postedSet = new Set(idsToPost);
        setIssueList((prev) => prev.map((i) => (postedSet.has(i.id) ? { ...i, isPosted: true } : i)));
        setSelectedIds(new Set());

        toast.success("Komentar Terpilih Berhasil Dikirim!", {
          description: `${data.data?.publishedCount || idsToPost.length} komentar temuan telah diposting ke Bitbucket PR #${bitbucketPrId}.`,
        });
        router.refresh();
      } else {
        toast.error(data.message || "Gagal mengirim komentar terpilih");
      }
    } catch (err) {
      console.error("Bulk post error:", err);
      toast.error("Terjadi kendala koneksi saat mengirim komentar ke Bitbucket.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Bulk mark false positive or valid
  const handleBulkMarkStatus = async (markAsFalsePositive: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsBulkSubmitting(true);
    try {
      const res = await fetch(`/api/pull-requests/${targetPrId}/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueIds: ids,
          isFalsePositive: markAsFalsePositive,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const setIds = new Set(ids);
        setIssueList((prev) =>
          prev.map((i) => (setIds.has(i.id) ? { ...i, isFalsePositive: markAsFalsePositive } : i)),
        );
        setSelectedIds(new Set());

        toast.success(
          markAsFalsePositive
            ? `${ids.length} temuan berhasil ditandai sebagai False Positive`
            : `${ids.length} temuan berhasil dikembalikan sebagai Valid`,
        );
        router.refresh();
      } else {
        toast.error(data.message || "Gagal memperbarui status temuan terpilih");
      }
    } catch (err) {
      console.error("Bulk mark status error:", err);
      toast.error("Terjadi kendala koneksi saat memperbarui status temuan.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const isAllSelectableChecked =
    filteredIssues.length > 0 &&
    filteredIssues.filter((i) => !i.isFalsePositive && !i.isPosted).every((i) => selectedIds.has(i.id)) &&
    filteredIssues.some((i) => !i.isFalsePositive && !i.isPosted);

  return (
    <div className="space-y-4">
      {/* Metric Summary Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5 rounded-lg border bg-card p-3 shadow-2xs">
          <span className="font-medium text-[11px] text-muted-foreground">Total Temuan AI</span>
          <span className="font-bold font-mono text-foreground text-xl">{counts.total}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 shadow-2xs">
          <span className="font-medium text-[11px] text-emerald-700 dark:text-emerald-400">Isu Valid (Siap Kirim)</span>
          <span className="font-bold font-mono text-emerald-700 text-xl dark:text-emerald-400">
            {counts.valid} <span className="font-normal text-xs">({counts.unpostedValid} belum kirim)</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border border-slate-500/20 bg-slate-500/5 p-3 shadow-2xs">
          <span className="font-medium text-[11px] text-slate-700 dark:text-slate-400">False Positive (Diabaikan)</span>
          <span className="font-bold font-mono text-slate-700 text-xl dark:text-slate-400">{counts.falsePositive}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 shadow-2xs">
          <span className="font-medium text-[11px] text-blue-700 dark:text-blue-400">Tersinkron ke Bitbucket</span>
          <span className="font-bold font-mono text-blue-700 text-xl dark:text-blue-400">{counts.posted}</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/40 p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
            <ListFilter className="size-3.5 text-primary" />
            Filter:
          </span>

          {/* Severity Filter */}
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-8 w-[145px] bg-background text-xs">
              <SelectValue placeholder="Keparahan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Keparahan</SelectItem>
              <SelectItem value="CRITICAL">🚨 Critical (Kritis)</SelectItem>
              <SelectItem value="HIGH">⚠️ High (Tinggi)</SelectItem>
              <SelectItem value="MEDIUM">🟡 Medium (Sedang)</SelectItem>
              <SelectItem value="LOW">🔵 Low (Rendah)</SelectItem>
              <SelectItem value="INFO">ℹ️ Info (Saran)</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[160px] bg-background text-xs">
              <SelectValue placeholder="Status Verifikasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="VALID">Hanya Valid</SelectItem>
              <SelectItem value="UNPOSTED">Valid &amp; Belum Kirim</SelectItem>
              <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
              <SelectItem value="POSTED">Sudah Tersinkron</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[155px] bg-background text-xs">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kategori</SelectItem>
              <SelectItem value="SECURITY">Security</SelectItem>
              <SelectItem value="BUG">Logic Bug</SelectItem>
              <SelectItem value="ARCHITECTURE">Architecture</SelectItem>
              <SelectItem value="SOP_VIOLATION">SOP Violation</SelectItem>
              <SelectItem value="BEST_PRACTICE">Best Practice</SelectItem>
            </SelectContent>
          </Select>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 size-3 text-muted-foreground" />
            <Input
              placeholder="Cari file / isi isu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-[180px] bg-background pl-7 text-xs"
            />
          </div>
        </div>

        <span className="font-mono text-muted-foreground text-xs">
          Menampilkan <strong>{filteredIssues.length}</strong> dari {issueList.length} total temuan
        </span>
      </div>

      {/* Bulk Action Bar (Visible when 1 or more items are selected) */}
      {selectedIds.size > 0 && (
        <div className="fade-in slide-in-from-top-1 sticky top-28 z-20 flex animate-in flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <Badge className="bg-blue-600 font-mono text-white text-xs">{selectedIds.size} dipilih</Badge>
            <span className="font-medium text-foreground text-xs">Aksi massal untuk issue yang dipilih:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkPost}
              disabled={isBulkSubmitting}
              className="h-8 gap-1.5 bg-blue-600 font-medium text-white text-xs hover:bg-blue-700"
            >
              {isBulkSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Kirim {selectedIds.size} Komentar ke Bitbucket
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkMarkStatus(true)}
              disabled={isBulkSubmitting}
              className="h-8 gap-1.5 border-slate-400 bg-background font-medium text-foreground text-xs hover:bg-muted"
            >
              <EyeOff className="size-3.5 text-muted-foreground" />
              Tandai sbg False Positive
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkSubmitting}
              className="h-8 text-muted-foreground text-xs"
            >
              Batal Pilih
            </Button>
          </div>
        </div>
      )}

      {/* Master Select All Row */}
      {filteredIssues.length > 0 && (
        <div className="flex items-center justify-between border-border/60 border-b px-3 py-1.5 text-muted-foreground text-xs">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-issues"
              checked={isAllSelectableChecked}
              onCheckedChange={(checked) => handleSelectAll(checked === true)}
            />
            <label htmlFor="select-all-issues" className="cursor-pointer select-none font-medium text-foreground">
              Pilih Semua Isu Valid yang Belum Terkirim ({counts.unpostedValid})
            </label>
          </div>

          <span className="font-mono text-[11px]">
            {selectedIds.size} dari {filteredIssues.length} terpilih
          </span>
        </div>
      )}

      {/* Issue Cards */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 py-12 text-center text-muted-foreground text-xs">
            Tidak ada temuan isu yang sesuai dengan filter yang dipilih.
          </div>
        ) : (
          filteredIssues.map((issue, idx) => {
            const severity = getSeverityConfig(issue.severity);
            const SeverityIcon = severity.icon;
            const isSelected = selectedIds.has(issue.id);
            const isProcessingThis = loadingIssueId === issue.id;
            const fileLang = detectLanguageFromPath(issue.filePath);

            return (
              <Card
                key={issue.id}
                className={`overflow-hidden border shadow-xs transition-all ${
                  issue.isFalsePositive
                    ? "border-border/60 bg-muted/15 opacity-75"
                    : `${severity.cardBorderClass} ${severity.cardBgClass}`
                } ${isSelected ? "ring-2 ring-blue-500/50" : ""}`}
              >
                {/* Header Row */}
                <CardHeader className={`border-border/50 border-b p-3.5 pb-2.5 ${severity.headerBgClass}`}>
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {/* Checkbox */}
                      {!issue.isPosted && !issue.isFalsePositive && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(issue.id)}
                          aria-label={`Pilih temuan #${idx + 1}`}
                          className="mr-1"
                        />
                      )}

                      <span className="font-mono font-semibold text-muted-foreground text-xs">#{idx + 1}</span>

                      {/* Severity Badge with distinct colors */}
                      <Badge className={`shrink-0 gap-1 font-semibold text-[10px] ${severity.badgeClass}`}>
                        <SeverityIcon className="size-3 shrink-0" />
                        {severity.badgeLabel}
                      </Badge>

                      {/* Category Badge */}
                      <Badge variant="outline" className="shrink-0 bg-background/80 font-mono text-[10px]">
                        {issue.category}
                      </Badge>

                      {/* File Path & Line Indicator */}
                      <div className="ml-0.5 flex items-center gap-1 truncate font-medium font-mono text-foreground text-xs">
                        <FileCode className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate" title={issue.filePath}>
                          {issue.filePath}
                        </span>
                        <span className="font-bold text-primary">:{issue.lineNumber}</span>
                        <Badge variant="secondary" className="h-4 shrink-0 px-1 py-0 font-mono text-[9px]">
                          {issue.lineType}
                        </Badge>
                      </div>
                    </div>

                    {/* Status & Action Buttons on Header */}
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      {/* Verification Status Badge */}
                      {issue.isPosted ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-1 border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          Tersinkron Bitbucket #{issue.bitbucketCommentId || "Posted"}
                        </Badge>
                      ) : issue.isFalsePositive ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-1 border-slate-400 bg-slate-500/10 font-mono text-[10px] text-slate-600 dark:text-slate-400"
                        >
                          <Ban className="size-3" />
                          False Positive (Diabaikan)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-1 border-emerald-500/30 font-mono text-[10px] text-emerald-700 dark:text-emerald-400"
                        >
                          <Check className="size-2.5" />
                          Valid (Siap Kirim)
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Card Content: Structured Indonesian Layout */}
                <CardContent className="space-y-3 p-3.5">
                  {/* Issue Title */}
                  <div>
                    <h3
                      className={`font-semibold text-sm ${
                        issue.isFalsePositive
                          ? "text-muted-foreground line-through decoration-muted-foreground/60"
                          : "text-foreground"
                      }`}
                    >
                      {issue.title}
                    </h3>
                  </div>

                  {/* Structured Details: Lokasi, Masalah, Dampak, Solusi */}
                  <div className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-3 text-xs leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="min-w-[70px] shrink-0 font-semibold text-muted-foreground">📍 Lokasi:</span>
                      <span className="font-mono text-foreground">
                        {issue.filePath}:{issue.lineNumber}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="min-w-[70px] shrink-0 font-semibold text-muted-foreground">⚠️ Uraian:</span>
                      <span className="whitespace-pre-wrap font-sans text-foreground">
                        {cleanIssueDescription(issue.description)}
                      </span>
                    </div>
                  </div>

                  {/* Suggested Code Fix using Shiki */}
                  {issue.suggestedFix && (
                    <div className="space-y-1.5 pt-1">
                      <span className="flex items-center gap-1.5 font-semibold text-[11px] text-foreground">
                        <Sparkles className="size-3.5 text-amber-500" />
                        Rekomendasi Perbaikan Kode:
                      </span>
                      <ShikiCodeView
                        code={issue.suggestedFix}
                        lang={fileLang}
                        title={`${issue.filePath.split("/").pop() || "code"} (Saran Perbaikan)`}
                        maxHeight="280px"
                      />
                    </div>
                  )}
                </CardContent>

                {/* Card Footer: Dedicated Prominent Action Bar */}
                <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-border/60 border-t bg-muted/20 px-4 py-3">
                  {/* Left: Verification Status */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground text-xs">Status Verifikasi:</span>
                    {issue.isPosted ? (
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 font-mono text-emerald-700 text-xs dark:text-emerald-400"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        Tersinkron Bitbucket #{issue.bitbucketCommentId ?? "Posted"}
                      </Badge>
                    ) : issue.isFalsePositive ? (
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-slate-400 bg-slate-500/10 font-mono text-slate-600 text-xs dark:text-slate-400"
                      >
                        <Ban className="size-3.5" />
                        False Positive (Diabaikan)
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 font-mono text-emerald-700 text-xs dark:text-emerald-400"
                      >
                        <Check className="size-3.5 text-emerald-600" />
                        Valid (Siap Kirim ke Bitbucket)
                      </Badge>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2.5">
                    {/* Toggle False Positive Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleFalsePositive(issue)}
                      disabled={isProcessingThis || isBulkSubmitting}
                      className={`h-8 gap-1.5 bg-background px-3 font-medium text-xs ${
                        issue.isFalsePositive
                          ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isProcessingThis ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : issue.isFalsePositive ? (
                        <>
                          <RotateCcw className="size-3.5 text-emerald-600" />
                          <span>Jadikan Valid</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3.5 text-muted-foreground" />
                          <span>Tandai False Positive</span>
                        </>
                      )}
                    </Button>

                    {/* Prominent Kirim Komentar ke Bitbucket Button */}
                    {issue.isFalsePositive ? (
                      <Button
                        size="sm"
                        disabled
                        variant="outline"
                        className="h-8 cursor-not-allowed gap-1.5 px-3 text-xs opacity-50"
                        title="Temuan ini ditandai False Positive. Jadikan Valid terlebih dahulu untuk mengirim ke Bitbucket."
                      >
                        <Send className="size-3.5" />
                        <span>Kirim Komentar ke Bitbucket</span>
                      </Button>
                    ) : issue.isPosted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePostSingleIssue(issue)}
                        disabled={isProcessingThis || isBulkSubmitting}
                        className="h-8 gap-1.5 border-blue-500/40 px-3 font-semibold text-blue-700 text-xs hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
                        title="Kirim ulang komentar temuan ini ke Bitbucket Server"
                      >
                        {isProcessingThis ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5 text-blue-600" />
                        )}
                        <span>Kirim Ulang ke Bitbucket</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handlePostSingleIssue(issue)}
                        disabled={isProcessingThis || isBulkSubmitting}
                        className="h-8 gap-1.5 bg-blue-600 px-4 font-semibold text-white text-xs shadow-sm hover:bg-blue-700"
                        title="Kirim komentar temuan ini langsung ke Bitbucket Server"
                      >
                        {isProcessingThis ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        <span>Kirim Komentar ke Bitbucket</span>
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
