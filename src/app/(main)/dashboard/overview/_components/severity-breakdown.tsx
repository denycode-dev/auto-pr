"use client";

import * as React from "react";

import Link from "next/link";

import { cn } from "cn";
import { AlertCircle, AlertTriangle, ArrowUpRight, Code2, Info, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReviewIssueItem {
  id: string;
  title: string;
  filePath: string;
  lineNumber: number;
  severity: string;
  category: string;
  createdAt: string;
  prId: string;
  prBitbucketId: number;
  prTitle: string;
  repoSlug: string;
}

interface SeverityCount {
  severity: string;
  count: number;
}

export function SeverityBreakdown() {
  const [issues, setIssues] = React.useState<ReviewIssueItem[]>([]);
  const [breakdown, setBreakdown] = React.useState<SeverityCount[]>([]);
  const [totalIssues, setTotalIssues] = React.useState<number>(0);
  const [selectedSeverity, setSelectedSeverity] = React.useState<string>("ALL");
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    fetch("/api/overview")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((res) => {
        if (res.success && res.data) {
          if (Array.isArray(res.data.recentIssues)) {
            setIssues(res.data.recentIssues);
          }
          if (Array.isArray(res.data.severityBreakdown)) {
            setBreakdown(res.data.severityBreakdown);
          }
          setTotalIssues(res.data.metrics?.totalIssuesCount ?? 0);
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil temuan isu:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getSeverityBadge = (severity: string) => {
    const sev = severity.toUpperCase();
    if (sev === "CRITICAL") {
      return (
        <Badge variant="destructive" className="h-5 gap-1 px-1.5 font-semibold text-[10px]">
          <ShieldAlert className="size-3" />
          Critical
        </Badge>
      );
    }
    if (sev === "HIGH") {
      return (
        <Badge className="h-5 gap-1 border border-amber-500/30 bg-amber-500/15 px-1.5 font-semibold text-[10px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-3 text-amber-500" />
          High
        </Badge>
      );
    }
    if (sev === "MEDIUM") {
      return (
        <Badge className="h-5 gap-1 border border-indigo-500/30 bg-indigo-500/15 px-1.5 font-semibold text-[10px] text-indigo-700 dark:text-indigo-400">
          <AlertCircle className="size-3 text-indigo-500" />
          Medium
        </Badge>
      );
    }
    if (sev === "LOW") {
      return (
        <Badge className="h-5 gap-1 border border-blue-500/30 bg-blue-500/15 px-1.5 font-semibold text-[10px] text-blue-700 dark:text-blue-400">
          <Info className="size-3 text-blue-500" />
          Low
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="h-5 gap-1 px-1.5 font-semibold text-[10px]">
        <Info className="size-3" />
        Info
      </Badge>
    );
  };

  const getCount = (sev: string) => {
    return breakdown.find((b) => b.severity === sev)?.count ?? 0;
  };

  const filterOptions = [
    { value: "ALL", label: "Semua", count: totalIssues },
    { value: "HIGH", label: "High", count: getCount("HIGH") },
    { value: "MEDIUM", label: "Medium", count: getCount("MEDIUM") },
    { value: "LOW", label: "Low", count: getCount("LOW") },
  ];

  const filteredIssues = React.useMemo(() => {
    if (selectedSeverity === "ALL") return issues;
    return issues.filter((i) => i.severity.toUpperCase() === selectedSeverity);
  }, [issues, selectedSeverity]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-3 py-4">
          <div className="h-10 animate-pulse rounded-md bg-muted/40" />
          <div className="h-10 animate-pulse rounded-md bg-muted/40" />
          <div className="h-10 animate-pulse rounded-md bg-muted/40" />
        </div>
      );
    }

    if (filteredIssues.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground text-xs">
          Tidak ada temuan isu untuk kategori keparahan ini.
        </div>
      );
    }

    return (
      <div className="max-h-[310px] divide-y divide-border/60 overflow-y-auto pr-1">
        {filteredIssues.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between gap-2.5 py-2.5 text-xs first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <div className="mt-0.5 shrink-0">{getSeverityBadge(item.severity)}</div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                  href={`/dashboard/pull-requests/${item.prId}`}
                  className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                  title={item.title}
                >
                  {item.title}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Code2 className="size-3 shrink-0 opacity-70" />
                  <span className="max-w-[220px] truncate" title={item.filePath}>
                    {item.filePath.split("/").slice(-2).join("/")}:{item.lineNumber}
                  </span>
                  <span>•</span>
                  <span className="text-muted-foreground/80">PR #{item.prBitbucketId}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground transition-colors hover:text-foreground group-hover:bg-muted"
              asChild
            >
              <Link href={`/dashboard/pull-requests/${item.prId}`} title={`Buka PR #${item.prBitbucketId}`}>
                <ArrowUpRight className="size-3.5" />
                <span className="sr-only">Buka PR #{item.prBitbucketId}</span>
              </Link>
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="flex flex-col gap-2.5 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="font-semibold text-base">Temuan Berdasarkan Tingkat Keparahan</CardTitle>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          <Badge variant="outline" className="whitespace-nowrap font-mono text-xs">
            {totalIssues} Total Isu
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-border/50 border-b pb-2.5">
          {filterOptions.map((opt) => {
            const isActive = selectedSeverity === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedSeverity(opt.value)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium text-xs transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span>{opt.label}</span>
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  ({opt.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Content List */}
        {renderContent()}
      </CardContent>
    </Card>
  );
}
