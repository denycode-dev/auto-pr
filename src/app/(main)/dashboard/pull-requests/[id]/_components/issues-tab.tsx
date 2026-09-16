"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Code2, ExternalLink, FileCode, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewIssue } from "@/data/code-review/types";

interface IssuesTabProps {
  issues: ReviewIssue[];
  bitbucketPrId: number;
}

export function IssuesTab({ issues, bitbucketPrId }: IssuesTabProps) {
  const [severityFilter, setSeverityFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");

  const filteredIssues = React.useMemo(() => {
    return issues.filter((issue) => {
      if (severityFilter !== "ALL" && issue.severity !== severityFilter) return false;
      if (categoryFilter !== "ALL" && issue.category !== categoryFilter) return false;
      return true;
    });
  }, [issues, severityFilter, categoryFilter]);

  return (
    <div className="space-y-4">
      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Filter Temuan:</span>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Tingkat Keparahan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Keparahan</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
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
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          Menampilkan <strong>{filteredIssues.length}</strong> dari {issues.length} total temuan
        </span>
      </div>

      {/* Issue Cards */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            Tidak ada isu yang cocok dengan filter yang dipilih.
          </div>
        ) : (
          filteredIssues.map((issue, idx) => {
            const isCritical = issue.severity === "CRITICAL";
            const isHigh = issue.severity === "HIGH";
            const isMedium = issue.severity === "MEDIUM";

            return (
              <Card
                key={issue.id}
                className={`overflow-hidden shadow-xs border transition-colors ${
                  isCritical
                    ? "border-rose-500/40 bg-rose-500/[0.02]"
                    : isHigh
                      ? "border-amber-500/40 bg-amber-500/[0.02]"
                      : "border-border/80"
                }`}
              >
                <CardHeader className="p-3.5 pb-2 bg-muted/20 border-b border-border/50">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-muted-foreground">
                        #{idx + 1}
                      </span>

                      {isCritical && (
                        <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
                          <ShieldAlert className="size-3" />
                          CRITICAL
                        </Badge>
                      )}
                      {isHigh && (
                        <Badge className="bg-amber-600 text-white text-[10px] font-semibold gap-1">
                          <AlertTriangle className="size-3" />
                          HIGH
                        </Badge>
                      )}
                      {isMedium && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 text-[10px]">
                          MEDIUM
                        </Badge>
                      )}
                      {!isCritical && !isHigh && !isMedium && (
                        <Badge variant="outline" className="text-[10px]">
                          {issue.severity}
                        </Badge>
                      )}

                      <Badge variant="outline" className="font-mono text-[10px] bg-muted/60">
                        {issue.category}
                      </Badge>

                      <div className="flex items-center gap-1 font-mono text-xs text-foreground font-medium ml-1">
                        <FileCode className="size-3.5 text-primary" />
                        <span>{issue.filePath}</span>
                        <span className="text-primary font-bold">:{issue.lineNumber}</span>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono">
                          {issue.lineType}
                        </Badge>
                      </div>
                    </div>

                    {/* Bitbucket Inline Comment Indicator */}
                    <div className="flex items-center gap-2">
                      {issue.isPosted ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] gap-1 font-mono">
                          <CheckCircle2 className="size-2.5" />
                          Bitbucket Inline #{issue.bitbucketCommentId || "Posted"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Belum Diposting
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 space-y-3">
                  {/* Issue Title & Description */}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-foreground">{issue.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed font-sans">{issue.description}</p>
                  </div>

                  {/* Suggested Code Fix */}
                  {issue.suggestedFix && (
                    <div className="rounded-md border border-border/80 bg-muted/60 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                        <span className="flex items-center gap-1.5 text-primary">
                          <Code2 className="size-3.5" />
                          Rekomendasi Perbaikan (Patch Proposal):
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          anchor: EFFECTIVE:{issue.lineNumber}
                        </span>
                      </div>
                      <pre className="font-mono text-xs p-2.5 rounded bg-background border border-border overflow-x-auto text-foreground">
                        <code>{issue.suggestedFix}</code>
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
