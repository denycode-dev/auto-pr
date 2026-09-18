"use client";

import * as React from "react";

import Link from "next/link";

import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2, GitBranch, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PullRequest } from "@/data/code-review/types";

export function ActiveQueuePreview() {
  const [prs, setPrs] = React.useState<PullRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/pull-requests?status=OPEN")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setPrs(res.data);
        } else {
          setPrs([]);
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil antrean PR:", err);
        setPrs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingPrs = prs.filter((p) => !p.seniorDecision || p.seniorDecision === "PENDING").slice(0, 4);

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="flex flex-col gap-2.5 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="font-semibold text-base">Antrean Pull Request Membutuhkan Tindakan</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1 self-start text-xs sm:self-center">
          <Link href="/dashboard/pull-requests">
            Lihat Antrean ({pendingPrs.length})
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] font-semibold text-xs">PR ID</TableHead>
                <TableHead className="font-semibold text-xs">Judul Pull Request</TableHead>
                <TableHead className="font-semibold text-xs">Repo / Branch</TableHead>
                <TableHead className="font-semibold text-xs">Rekomendasi AI</TableHead>
                <TableHead className="text-center font-semibold text-xs">Isu</TableHead>
                <TableHead className="text-center font-semibold text-xs">Skor SOP</TableHead>
                <TableHead className="pr-4 text-right font-semibold text-xs">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                    Memuat antrean PR...
                  </TableCell>
                </TableRow>
              ) : pendingPrs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-xs">
                    Tidak ada antrean pull request yang membutuhkan tindakan saat ini.
                  </TableCell>
                </TableRow>
              ) : (
                pendingPrs.map((pr) => {
                  const isNeedsWork = pr.aiRecommendation === "RECOMMENDED_NEEDS_WORK";
                  const isApprove = pr.aiRecommendation === "RECOMMENDED_APPROVE";
                  const isDecline = pr.aiRecommendation === "RECOMMENDED_DECLINE";

                  return (
                    <TableRow key={pr.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium font-mono text-xs">
                        <span className="text-primary hover:underline">#{pr.bitbucketPrId}</span>
                      </TableCell>

                      <TableCell className="max-w-[280px]">
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={`/dashboard/pull-requests/${pr.id}`}
                            className="line-clamp-1 font-medium text-foreground text-xs transition-colors hover:text-primary"
                          >
                            {pr.title}
                          </Link>
                          <span className="text-[11px] text-muted-foreground">oleh {pr.authorName}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{pr.repositorySlug}</span>
                          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                            <GitBranch className="size-3" />
                            {pr.sourceBranch}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {isApprove && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-500/30 bg-emerald-500/10 font-medium text-[11px] text-emerald-700 dark:text-emerald-400"
                          >
                            <CheckCircle2 className="size-3" />
                            Approve
                          </Badge>
                        )}
                        {isNeedsWork && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/30 bg-amber-500/10 font-medium text-[11px] text-amber-700 dark:text-amber-400"
                          >
                            <AlertTriangle className="size-3" />
                            Needs Work
                          </Badge>
                        )}
                        {isDecline && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-rose-500/30 bg-rose-500/10 font-medium text-[11px] text-rose-700 dark:text-rose-400"
                          >
                            <XCircle className="size-3" />
                            Decline
                          </Badge>
                        )}
                        {!pr.aiRecommendation && (
                          <Badge
                            variant="outline"
                            className="border-muted bg-muted/40 text-[11px] text-muted-foreground"
                          >
                            Menganalisis...
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs">
                        {pr.criticalCount > 0 ? (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                            {pr.criticalCount} Crit
                          </Badge>
                        ) : pr.highCount > 0 ? (
                          <Badge className="h-5 border border-amber-500/30 bg-amber-500/15 px-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                            {pr.highCount} High
                          </Badge>
                        ) : pr.totalIssues > 0 ? (
                          <span className="text-muted-foreground">{pr.totalIssues} isu</span>
                        ) : (
                          <span className="text-emerald-600 text-xs dark:text-emerald-400">0 isu</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-mono font-semibold text-xs">
                        {pr.sopScore > 0 ? (
                          <span
                            className={
                              pr.sopScore >= 80
                                ? "text-emerald-600 dark:text-emerald-400"
                                : pr.sopScore >= 60
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {pr.sopScore}/100
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 gap-1 whitespace-nowrap text-xs"
                        >
                          <Link href={`/dashboard/pull-requests/${pr.id}`}>
                            Review PR
                            <ArrowUpRight className="size-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
