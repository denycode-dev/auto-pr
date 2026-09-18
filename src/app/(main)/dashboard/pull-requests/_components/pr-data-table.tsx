"use client";

import * as React from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DownloadCloud,
  Filter,
  GitBranch,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";

import { DashboardEmptyState } from "@/app/(main)/dashboard/_components/dashboard-empty-state";
import { dashboardTableStyles } from "@/app/(main)/dashboard/_components/dashboard-table-styles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PullRequest, Repository, SeniorDecision } from "@/data/code-review/types";

export interface PrDataTableProps {
  onOpenSyncDialog?: () => void;
  refreshKey?: number;
}

function normalizeSeniorDecision(decision?: string | null): SeniorDecision {
  if (!decision) return "PENDING";
  if (decision === "APPROVE" || decision === "APPROVED") return "APPROVED";
  if (decision === "DECLINE" || decision === "DECLINED") return "DECLINED";
  if (decision === "NEEDS_WORK") return "NEEDS_WORK";
  return "PENDING";
}

export function PrDataTable({ onOpenSyncDialog, refreshKey = 0 }: PrDataTableProps = {}) {
  const [prs, setPrs] = React.useState<PullRequest[]>([]);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [_loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRepo, setSelectedRepo] = React.useState("ALL");
  const [selectedRecommendation, setSelectedRecommendation] = React.useState("ALL");
  const [selectedDecision, setSelectedDecision] = React.useState("ALL");

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [prRes, repoRes] = await Promise.all([fetch("/api/pull-requests"), fetch("/api/repositories")]);

      if (prRes.ok) {
        const prJson = await prRes.json();
        if (prJson.success && Array.isArray(prJson.data)) {
          setPrs(prJson.data);
        } else {
          setPrs([]);
        }
      } else {
        setPrs([]);
      }

      if (repoRes.ok) {
        const repoJson = await repoRes.json();
        if (repoJson.success && Array.isArray(repoJson.data)) {
          setRepositories(repoJson.data);
        } else {
          setRepositories([]);
        }
      } else {
        setRepositories([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data PR:", err);
      setPrs([]);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (refreshKey !== undefined) {
      void fetchData();
    }
  }, [fetchData, refreshKey]);

  const filteredPrs = React.useMemo(() => {
    return prs.filter((pr) => {
      const decision = normalizeSeniorDecision(pr.seniorDecision);

      // Decision filter
      if (selectedDecision === "PENDING" && decision !== "PENDING") return false;
      if (
        selectedDecision === "NEEDS_WORK" &&
        decision !== "NEEDS_WORK" &&
        pr.aiRecommendation !== "RECOMMENDED_NEEDS_WORK"
      )
        return false;
      if (selectedDecision === "APPROVED" && decision !== "APPROVED") return false;
      if (selectedDecision === "DECLINED" && decision !== "DECLINED") return false;

      // Repo filter
      if (selectedRepo !== "ALL" && pr.repositorySlug !== selectedRepo) return false;

      // Recommendation filter
      if (selectedRecommendation !== "ALL" && pr.aiRecommendation !== selectedRecommendation) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = pr.title.toLowerCase().includes(q);
        const matchesAuthor = pr.authorName.toLowerCase().includes(q) || pr.authorSlug.toLowerCase().includes(q);
        const matchesId = pr.bitbucketPrId.toString().includes(q);
        const matchesBranch = pr.sourceBranch.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAuthor && !matchesId && !matchesBranch) return false;
      }

      return true;
    });
  }, [prs, selectedDecision, selectedRepo, selectedRecommendation, searchQuery]);

  const counts = React.useMemo(() => {
    return {
      all: prs.length,
      pending: prs.filter((p) => normalizeSeniorDecision(p.seniorDecision) === "PENDING").length,
      needsWork: prs.filter(
        (p) =>
          p.aiRecommendation === "RECOMMENDED_NEEDS_WORK" || normalizeSeniorDecision(p.seniorDecision) === "NEEDS_WORK",
      ).length,
      approved: prs.filter((p) => normalizeSeniorDecision(p.seniorDecision) === "APPROVED").length,
      declined: prs.filter((p) => normalizeSeniorDecision(p.seniorDecision) === "DECLINED").length,
    };
  }, [prs]);

  const hasActiveFilters = Boolean(
    searchQuery || selectedRepo !== "ALL" || selectedRecommendation !== "ALL" || selectedDecision !== "ALL",
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedRepo("ALL");
    setSelectedRecommendation("ALL");
    setSelectedDecision("ALL");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-64 lg:w-72">
              <InputGroup className="w-full">
                <InputGroupAddon>
                  <Search className="size-3.5" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Cari judul, author, branch, #ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs"
                />
              </InputGroup>
            </div>

            {/* Decision Filter Dropdown */}
            <Select value={selectedDecision} onValueChange={setSelectedDecision}>
              <SelectTrigger className="h-9 w-[190px] text-xs">
                <SelectValue placeholder="Keputusan Senior" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua Keputusan ({counts.all})
                </SelectItem>
                <SelectItem value="PENDING" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 text-amber-500" />
                    <span>Menunggu ({counts.pending})</span>
                  </div>
                </SelectItem>
                <SelectItem value="NEEDS_WORK" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3 text-amber-500" />
                    <span>Perlu Revisi ({counts.needsWork})</span>
                  </div>
                </SelectItem>
                <SelectItem value="APPROVED" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    <span>Disetujui ({counts.approved})</span>
                  </div>
                </SelectItem>
                <SelectItem value="DECLINED" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="size-3 text-rose-500" />
                    <span>Ditolak ({counts.declined})</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Recommendation Filter Dropdown */}
            <Select value={selectedRecommendation} onValueChange={setSelectedRecommendation}>
              <SelectTrigger className="h-9 w-[180px] text-xs">
                <SelectValue placeholder="Rekomendasi AI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua Rekomendasi
                </SelectItem>
                <SelectItem value="RECOMMENDED_APPROVE" className="text-xs">
                  Disarankan Approve
                </SelectItem>
                <SelectItem value="RECOMMENDED_NEEDS_WORK" className="text-xs">
                  Disarankan Needs Work
                </SelectItem>
                <SelectItem value="RECOMMENDED_DECLINE" className="text-xs">
                  Disarankan Decline
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Repository Filter Dropdown */}
            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
              <SelectTrigger className="h-9 w-[180px] text-xs">
                <Filter className="mr-1 size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Semua Repositori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua Repositori
                </SelectItem>
                {repositories.map((repo) => (
                  <SelectItem key={repo.slug} value={repo.slug} className="text-xs">
                    {repo.projectKey} / {repo.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right Action & Info */}
          <div className="flex shrink-0 items-center gap-2 self-end lg:self-center">
            <span className="font-mono text-muted-foreground text-xs">{filteredPrs.length} PR ditemukan</span>
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

      {/* Table Container */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className={`w-[85px] ${dashboardTableStyles.th}`}>PR ID</TableHead>
                <TableHead className={`min-w-[280px] ${dashboardTableStyles.th}`}>Pull Request & Author</TableHead>
                <TableHead className={`min-w-[190px] ${dashboardTableStyles.th}`}>Repo & Branches</TableHead>
                <TableHead className={`w-[150px] ${dashboardTableStyles.th}`}>Rekomendasi AI</TableHead>
                <TableHead className={`w-[130px] ${dashboardTableStyles.th}`}>Status Senior</TableHead>
                <TableHead className={`w-[120px] ${dashboardTableStyles.th}`}>Temuan Isu</TableHead>
                <TableHead className={`w-[100px] ${dashboardTableStyles.th}`}>Skor SOP</TableHead>
                <TableHead className={dashboardTableStyles.thStickyAction}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                if (prs.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <DashboardEmptyState
                          icon={DownloadCloud}
                          title="Antrean Pull Request Kosong"
                          description="Belum ada pull request yang terdaftar di database lokal. Tarik pull request yang sedang aktif langsung dari Bitbucket Server 8.19."
                          action={
                            onOpenSyncDialog && (
                              <Button
                                size="sm"
                                onClick={onOpenSyncDialog}
                                className="gap-2 font-semibold text-xs shadow-xs"
                              >
                                <DownloadCloud className="size-3.5" />
                                Tarik PR dari Bitbucket
                              </Button>
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                }

                if (filteredPrs.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                        <p className="font-medium text-foreground text-xs">Tidak ada hasil yang cocok</p>
                        <p className="pt-1 text-muted-foreground text-xs">
                          Coba sesuaikan kata kunci pencarian atau filter status yang dipilih.
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                }

                return filteredPrs.map((pr) => {
                  const isNeedsWork = pr.aiRecommendation === "RECOMMENDED_NEEDS_WORK";
                  const isApprove = pr.aiRecommendation === "RECOMMENDED_APPROVE";
                  const isDecline = pr.aiRecommendation === "RECOMMENDED_DECLINE";

                  return (
                    <TableRow key={pr.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-semibold text-primary text-xs">
                        #{pr.bitbucketPrId}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <Avatar className="mt-0.5 size-6 shrink-0 border border-border">
                            {pr.authorAvatar && <AvatarImage src={pr.authorAvatar} />}
                            <AvatarFallback className="text-[10px]">
                              {pr.authorName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={`/dashboard/pull-requests/${pr.id}`}
                              className="line-clamp-1 font-medium text-foreground text-xs transition-colors hover:text-primary"
                            >
                              {pr.title}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{pr.authorName}</span>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-muted-foreground/80">
                                {pr.latestCommitHash.slice(0, 7)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-medium font-mono text-foreground">
                            {pr.projectKey} / {pr.repositorySlug}
                          </span>
                          <div className="flex items-center gap-1 pt-0.5 text-[10px] text-muted-foreground">
                            <GitBranch className="size-3" />
                            <span className="max-w-[100px] truncate font-mono">{pr.sourceBranch}</span>
                            <span>→</span>
                            <span className="font-mono">{pr.targetBranch}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {(() => {
                          if (pr.aiReviewStatus === "NOT_STARTED") {
                            return (
                              <Badge
                                variant="outline"
                                className="border-muted bg-muted/40 text-[11px] text-muted-foreground"
                              >
                                Belum Dianalisis
                              </Badge>
                            );
                          }
                          if (pr.aiReviewStatus === "IN_PROGRESS") {
                            return (
                              <Badge
                                variant="outline"
                                className="animate-pulse border-primary/40 bg-primary/10 text-[11px] text-primary"
                              >
                                Sedang Dianalisis...
                              </Badge>
                            );
                          }
                          if (isApprove) {
                            return (
                              <Badge
                                variant="outline"
                                className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400"
                              >
                                <CheckCircle2 className="size-3" />
                                Approve
                              </Badge>
                            );
                          }
                          if (isNeedsWork) {
                            return (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400"
                              >
                                <AlertTriangle className="size-3" />
                                Needs Work
                              </Badge>
                            );
                          }
                          if (isDecline) {
                            return (
                              <Badge
                                variant="outline"
                                className="gap-1 border-rose-500/30 bg-rose-500/10 text-[11px] text-rose-700 dark:text-rose-400"
                              >
                                <XCircle className="size-3" />
                                Decline
                              </Badge>
                            );
                          }
                          return (
                            <Badge
                              variant="outline"
                              className="border-muted bg-muted/40 text-[11px] text-muted-foreground"
                            >
                              Selesai
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      <TableCell>
                        {(() => {
                          const decision = normalizeSeniorDecision(pr.seniorDecision);
                          if (decision === "APPROVED") {
                            return <Badge className="bg-emerald-600 text-[11px] text-white">Approved</Badge>;
                          }
                          if (decision === "NEEDS_WORK") {
                            return <Badge className="bg-amber-600 text-[11px] text-white">Needs Work</Badge>;
                          }
                          if (decision === "DECLINED") {
                            return (
                              <Badge variant="destructive" className="text-[11px]">
                                Declined
                              </Badge>
                            );
                          }
                          return (
                            <Badge
                              variant="outline"
                              className="border-amber-500/40 text-[11px] text-amber-600 dark:text-amber-400"
                            >
                              Menunggu Keputusan
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs">
                        {(() => {
                          if (pr.aiReviewStatus === "NOT_STARTED") {
                            return <span className="text-muted-foreground">-</span>;
                          }
                          if (pr.criticalCount > 0) {
                            return (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                {pr.criticalCount} Critical
                              </Badge>
                            );
                          }
                          if (pr.highCount > 0) {
                            return (
                              <Badge className="h-5 border border-amber-500/30 bg-amber-500/15 px-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                                {pr.highCount} High
                              </Badge>
                            );
                          }
                          if (pr.totalIssues > 0) {
                            return <span className="text-muted-foreground">{pr.totalIssues} temuan</span>;
                          }
                          return <span className="font-medium text-emerald-600 dark:text-emerald-400">0 temuan</span>;
                        })()}
                      </TableCell>

                      <TableCell className="text-center font-mono font-semibold text-xs">
                        {(() => {
                          if (pr.aiReviewStatus !== "COMPLETED" || pr.sopScore <= 0) {
                            return <span className="text-muted-foreground">-</span>;
                          }
                          let scoreColor = "text-rose-600 dark:text-rose-400";
                          if (pr.sopScore >= 80) {
                            scoreColor = "text-emerald-600 dark:text-emerald-400";
                          } else if (pr.sopScore >= 60) {
                            scoreColor = "text-amber-600 dark:text-amber-400";
                          }
                          return <span className={scoreColor}>{pr.sopScore}%</span>;
                        })()}
                      </TableCell>

                      <TableCell className={dashboardTableStyles.tdStickyAction}>
                        <Button asChild size="sm" className="h-8 gap-1 font-semibold text-xs shadow-xs">
                          <Link href={`/dashboard/pull-requests/${pr.id}`}>
                            Review
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
