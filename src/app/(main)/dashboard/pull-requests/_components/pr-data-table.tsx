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
  GitPullRequest,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PullRequest, Repository } from "@/data/code-review/types";

export interface PrDataTableProps {
  onOpenSyncDialog?: () => void;
  refreshKey?: number;
}

export function PrDataTable({ onOpenSyncDialog, refreshKey = 0 }: PrDataTableProps = {}) {
  const [prs, setPrs] = React.useState<PullRequest[]>([]);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRepo, setSelectedRepo] = React.useState("ALL");
  const [selectedRecommendation, setSelectedRecommendation] = React.useState("ALL");
  const [activeTab, setActiveTab] = React.useState("ALL");

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [prRes, repoRes] = await Promise.all([
        fetch("/api/pull-requests"),
        fetch("/api/repositories"),
      ]);

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
    fetchData();
  }, [fetchData, refreshKey]);

  const filteredPrs = React.useMemo(() => {
    return prs.filter((pr) => {
      // Tab filter
      if (activeTab === "PENDING" && pr.seniorDecision !== "PENDING") return false;
      if (
        activeTab === "NEEDS_WORK" &&
        pr.seniorDecision !== "NEEDS_WORK" &&
        pr.aiRecommendation !== "RECOMMENDED_NEEDS_WORK"
      )
        return false;
      if (activeTab === "APPROVED" && pr.seniorDecision !== "APPROVED") return false;
      if (activeTab === "DECLINED" && pr.seniorDecision !== "DECLINED") return false;

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
      pending: prs.filter((p) => p.seniorDecision === "PENDING").length,
      needsWork: prs.filter(
        (p) => p.aiRecommendation === "RECOMMENDED_NEEDS_WORK" || p.seniorDecision === "NEEDS_WORK"
      ).length,
      approved: prs.filter((p) => p.seniorDecision === "APPROVED").length,
      declined: prs.filter((p) => p.seniorDecision === "DECLINED").length,
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
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1 text-xs"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Select value={selectedRepo} onValueChange={setSelectedRepo}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <Filter className="size-3.5 mr-1 text-muted-foreground" />
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
            <SelectTrigger className="w-[190px] h-9 text-xs">
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
        <TabsList className="w-full justify-start h-9 p-0.5 bg-muted/60 overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="ALL" className="text-xs gap-1.5 px-3">
            Semua PR
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="PENDING" className="text-xs gap-1.5 px-3">
            <Clock className="size-3 text-amber-500" />
            Menunggu Keputusan Senior
            <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0 text-[10px] font-mono">
              {counts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="NEEDS_WORK" className="text-xs gap-1.5 px-3">
            <AlertTriangle className="size-3 text-amber-500" />
            Perlu Revisi
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {counts.needsWork}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="text-xs gap-1.5 px-3">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Disetujui
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {counts.approved}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="DECLINED" className="text-xs gap-1.5 px-3">
            <XCircle className="size-3 text-rose-500" />
            Ditolak
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {counts.declined}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table Card */}
      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] text-xs font-semibold">PR ID</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[280px]">Pull Request & Author</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[190px]">Repo & Branches</TableHead>
                  <TableHead className="text-xs font-semibold">Rekomendasi AI</TableHead>
                  <TableHead className="text-xs font-semibold">Status Senior</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Temuan Isu</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Skor SOP</TableHead>
                  <TableHead className="text-right text-xs font-semibold pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                        <div className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40 p-3.5 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                          <DownloadCloud className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-base text-foreground">Antrean Pull Request Kosong</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Belum ada pull request yang terdaftar di database lokal. Tarik pull request yang sedang aktif langsung dari Bitbucket Server 8.19.
                          </p>
                        </div>
                        {onOpenSyncDialog && (
                          <Button
                            size="sm"
                            onClick={onOpenSyncDialog}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs font-semibold shadow-xs mt-2"
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
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                      <p className="font-medium text-foreground text-xs">Tidak ada hasil yang cocok</p>
                      <p className="text-xs text-muted-foreground pt-1">
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
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          #{pr.bitbucketPrId}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-start gap-2.5">
                            <Avatar className="size-6 shrink-0 mt-0.5 border border-border">
                              {pr.authorAvatar && <AvatarImage src={pr.authorAvatar} />}
                              <AvatarFallback className="text-[10px]">
                                {pr.authorName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-0.5">
                              <Link
                                href={`/dashboard/pull-requests/${pr.id}`}
                                className="font-medium text-xs text-foreground hover:text-primary transition-colors line-clamp-1"
                              >
                                {pr.title}
                              </Link>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>{pr.authorName}</span>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-muted-foreground/80">{pr.latestCommitHash.slice(0, 7)}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="font-mono font-medium text-foreground">
                              {pr.projectKey} / {pr.repositorySlug}
                            </span>
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px] pt-0.5">
                              <GitBranch className="size-3" />
                              <span className="truncate max-w-[100px] font-mono">{pr.sourceBranch}</span>
                              <span>→</span>
                              <span className="font-mono">{pr.targetBranch}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {pr.aiReviewStatus === "NOT_STARTED" ? (
                            <Badge variant="outline" className="border-muted bg-muted/40 text-muted-foreground text-[11px]">
                              Belum Dianalisis
                            </Badge>
                          ) : pr.aiReviewStatus === "IN_PROGRESS" ? (
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[11px] animate-pulse">
                              Sedang Dianalisis...
                            </Badge>
                          ) : isApprove ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1 text-[11px]">
                              <CheckCircle2 className="size-3" />
                              Approve
                            </Badge>
                          ) : isNeedsWork ? (
                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 text-[11px]">
                              <AlertTriangle className="size-3" />
                              Needs Work
                            </Badge>
                          ) : isDecline ? (
                            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 gap-1 text-[11px]">
                              <XCircle className="size-3" />
                              Decline
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-muted bg-muted/40 text-muted-foreground text-[11px]">
                              Selesai
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {pr.seniorDecision === "APPROVED" && (
                            <Badge className="bg-emerald-600 text-white text-[11px]">Approved</Badge>
                          )}
                          {pr.seniorDecision === "NEEDS_WORK" && (
                            <Badge className="bg-amber-600 text-white text-[11px]">Needs Work</Badge>
                          )}
                          {pr.seniorDecision === "DECLINED" && (
                            <Badge variant="destructive" className="text-[11px]">Declined</Badge>
                          )}
                          {pr.seniorDecision === "PENDING" && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px]">
                              Menunggu Keputusan
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs">
                          {pr.aiReviewStatus === "NOT_STARTED" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : pr.criticalCount > 0 ? (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              {pr.criticalCount} Critical
                            </Badge>
                          ) : pr.highCount > 0 ? (
                            <Badge className="h-5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 text-[10px]">
                              {pr.highCount} High
                            </Badge>
                          ) : pr.totalIssues > 0 ? (
                            <span className="text-muted-foreground">{pr.totalIssues} temuan</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">0 temuan</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs font-semibold">
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

                        <TableCell className="text-right pr-4">
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
