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
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRepo, setSelectedRepo] = React.useState("ALL");
  const [selectedRecommendation, setSelectedRecommendation] = React.useState("ALL");
  const [activeTab, setActiveTab] = React.useState("PENDING");

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

      // Tab filter
      if (activeTab === "PENDING" && decision !== "PENDING") return false;
      if (activeTab === "NEEDS_WORK" && decision !== "NEEDS_WORK" && pr.aiRecommendation !== "RECOMMENDED_NEEDS_WORK")
        return false;
      if (activeTab === "APPROVED" && decision !== "APPROVED") return false;
      if (activeTab === "DECLINED" && decision !== "DECLINED") return false;

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
  }, [prs, activeTab, selectedRepo, selectedRecommendation, searchQuery]);

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

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <InputGroup className="w-full lg:max-w-md">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Cari PR berdasarkan judul, author, branch, atau #ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Select value={selectedRepo} onValueChange={setSelectedRepo}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <Filter className="mr-1 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Semua Repositori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Repositori</SelectItem>
              {repositories.map((repo) => (
                <SelectItem key={repo.slug} value={repo.slug}>
                  {repo.projectKey} / {repo.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRecommendation} onValueChange={setSelectedRecommendation}>
            <SelectTrigger className="h-9 w-[190px] text-xs">
              <SelectValue placeholder="Rekomendasi AI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Rekomendasi</SelectItem>
              <SelectItem value="RECOMMENDED_APPROVE">Disarankan Approve</SelectItem>
              <SelectItem value="RECOMMENDED_NEEDS_WORK">Disarankan Needs Work</SelectItem>
              <SelectItem value="RECOMMENDED_DECLINE">Disarankan Decline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full overflow-hidden">
        <TabsList className="h-9 w-full justify-start overflow-x-auto overflow-y-hidden bg-muted/60 p-0.5">
          <TabsTrigger value="PENDING" className="gap-1.5 px-3 text-xs">
            <Clock className="size-3 text-amber-500" />
            Menunggu Keputusan
            <Badge
              variant="secondary"
              className="bg-amber-500/15 px-1.5 py-0 font-mono text-[10px] text-amber-700 dark:text-amber-300"
            >
              {counts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="NEEDS_WORK" className="gap-1.5 px-3 text-xs">
            <AlertTriangle className="size-3 text-amber-500" />
            Perlu Revisi
            <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[10px]">
              {counts.needsWork}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="gap-1.5 px-3 text-xs">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Disetujui
            <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[10px]">
              {counts.approved}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="DECLINED" className="gap-1.5 px-3 text-xs">
            <XCircle className="size-3 text-rose-500" />
            Ditolak
            <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[10px]">
              {counts.declined}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ALL" className="gap-1.5 px-3 text-xs">
            Semua PR
            <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[10px]">
              {counts.all}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table Card */}
      <Card className="overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] font-semibold text-xs">PR ID</TableHead>
                  <TableHead className="min-w-[280px] font-semibold text-xs">Pull Request & Author</TableHead>
                  <TableHead className="min-w-[190px] font-semibold text-xs">Repo & Branches</TableHead>
                  <TableHead className="font-semibold text-xs">Rekomendasi AI</TableHead>
                  <TableHead className="font-semibold text-xs">Status Senior</TableHead>
                  <TableHead className="text-center font-semibold text-xs">Temuan Isu</TableHead>
                  <TableHead className="text-center font-semibold text-xs">Skor SOP</TableHead>
                  <TableHead className="pr-4 text-right font-semibold text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
                        <div className="rounded-full border border-indigo-200 bg-indigo-50 p-3.5 text-indigo-600 shadow-2xs dark:border-indigo-800/40 dark:bg-indigo-950/50 dark:text-indigo-400">
                          <DownloadCloud className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-base text-foreground">Antrean Pull Request Kosong</h3>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            Belum ada pull request yang terdaftar di database lokal. Tarik pull request yang sedang
                            aktif langsung dari Bitbucket Server 8.19.
                          </p>
                        </div>
                        {onOpenSyncDialog && (
                          <Button
                            size="sm"
                            onClick={onOpenSyncDialog}
                            className="mt-2 gap-2 bg-indigo-600 font-semibold text-white text-xs shadow-xs hover:bg-indigo-700"
                          >
                            <DownloadCloud className="size-3.5" />
                            Tarik PR dari Bitbucket
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPrs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      <p className="font-medium text-foreground text-xs">Tidak ada hasil yang cocok</p>
                      <p className="pt-1 text-muted-foreground text-xs">
                        Coba sesuaikan kata kunci pencarian atau filter status yang dipilih.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrs.map((pr) => {
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
                          {pr.aiReviewStatus === "NOT_STARTED" ? (
                            <Badge
                              variant="outline"
                              className="border-muted bg-muted/40 text-[11px] text-muted-foreground"
                            >
                              Belum Dianalisis
                            </Badge>
                          ) : pr.aiReviewStatus === "IN_PROGRESS" ? (
                            <Badge
                              variant="outline"
                              className="animate-pulse border-primary/40 bg-primary/10 text-[11px] text-primary"
                            >
                              Sedang Dianalisis...
                            </Badge>
                          ) : isApprove ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="size-3" />
                              Approve
                            </Badge>
                          ) : isNeedsWork ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400"
                            >
                              <AlertTriangle className="size-3" />
                              Needs Work
                            </Badge>
                          ) : isDecline ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-rose-500/30 bg-rose-500/10 text-[11px] text-rose-700 dark:text-rose-400"
                            >
                              <XCircle className="size-3" />
                              Decline
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-muted bg-muted/40 text-[11px] text-muted-foreground"
                            >
                              Selesai
                            </Badge>
                          )}
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
                          {pr.aiReviewStatus === "NOT_STARTED" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : pr.criticalCount > 0 ? (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              {pr.criticalCount} Critical
                            </Badge>
                          ) : pr.highCount > 0 ? (
                            <Badge className="h-5 border border-amber-500/30 bg-amber-500/15 px-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                              {pr.highCount} High
                            </Badge>
                          ) : pr.totalIssues > 0 ? (
                            <span className="text-muted-foreground">{pr.totalIssues} temuan</span>
                          ) : (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">0 temuan</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-mono font-semibold text-xs">
                          {pr.aiReviewStatus === "COMPLETED" && pr.sopScore > 0 ? (
                            <span
                              className={
                                pr.sopScore >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : pr.sopScore >= 60
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {pr.sopScore}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className="pr-4 text-right">
                          <Button asChild size="sm" className="h-8 gap-1 text-xs shadow-xs">
                            <Link href={`/dashboard/pull-requests/${pr.id}`}>
                              Review
                              <ArrowUpRight className="size-3.5" />
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
    </div>
  );
}
