import { notFound } from "next/navigation";

import { Code2, History, ListFilter, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PullRequest } from "@/data/code-review/types";
import prisma from "@/lib/prisma";
import { deduplicateIssues } from "@/server/review/diff-filter";

import { AiRecommendationBanner } from "./_components/ai-recommendation-banner";
import { CodeDiffViewer } from "./_components/code-diff-viewer";
import { IssuesTab } from "./_components/issues-tab";
import { PrDetailHeader } from "./_components/pr-detail-header";
import { ReviewRunsTab } from "./_components/review-runs-tab";
import { SeniorActionBar } from "./_components/senior-action-bar";
import { SopComplianceTab } from "./_components/sop-compliance-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

function normalizeSeniorDecision(decision?: string | null): "APPROVED" | "NEEDS_WORK" | "DECLINED" | "PENDING" {
  if (decision === "APPROVE") return "APPROVED";
  if (decision === "DECLINE") return "DECLINED";
  if (decision === "APPROVED" || decision === "NEEDS_WORK" || decision === "DECLINED") return decision;
  return "PENDING";
}

export default async function PullRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  let pr: PullRequest | null = null;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const numId = Number(id);
    const isNumeric = !Number.isNaN(numId);

    const dbPr = await prisma.pullRequest.findFirst({
      where: isUuid ? { id } : isNumeric ? { bitbucketPrId: numId } : { id: "00000000-0000-0000-0000-000000000000" },
      include: {
        repository: true,
        reviewRuns: {
          orderBy: { createdAt: "desc" },
          include: {
            issues: {
              orderBy: [{ severity: "asc" }, { lineNumber: "asc" }],
            },
          },
        },
      },
    });

    if (dbPr) {
      const latestRun = dbPr.reviewRuns[0];
      // Aggregate issues across runs and deduplicate so no duplicate issues appear in reports
      const allIssuesRaw = dbPr.reviewRuns.flatMap((r) => r.issues);
      const uniqueIssues = deduplicateIssues(allIssuesRaw);

      pr = {
        id: dbPr.id,
        repositoryId: dbPr.repositoryId,
        projectKey: dbPr.repository.projectKey,
        repositorySlug: dbPr.repository.slug,
        bitbucketPrId: dbPr.bitbucketPrId,
        title: dbPr.title,
        authorName: dbPr.authorName,
        authorSlug: dbPr.authorSlug,
        sourceBranch: dbPr.sourceBranch,
        targetBranch: dbPr.targetBranch,
        latestCommitHash: dbPr.latestCommitHash,
        bitbucketVersion: dbPr.bitbucketVersion,
        prStatus: dbPr.prStatus as any,
        aiReviewStatus: dbPr.aiReviewStatus as any,
        aiRecommendation: (dbPr.aiRecommendation || undefined) as any,
        seniorDecision: normalizeSeniorDecision(dbPr.seniorDecision),
        seniorNotes: dbPr.seniorNotes || undefined,
        decidedAt: dbPr.decidedAt?.toISOString(),
        filesChangedCount: dbPr.filesChangedCount ?? 0,
        additionsCount: dbPr.additionsCount ?? 0,
        deletionsCount: dbPr.deletionsCount ?? 0,
        cachedDiff: dbPr.cachedDiff,
        cachedDiffHash: dbPr.cachedDiffHash,
        totalIssues: uniqueIssues.length,
        criticalCount: uniqueIssues.filter((i) => i.severity === "CRITICAL").length,
        highCount: uniqueIssues.filter((i) => i.severity === "HIGH").length,
        mediumCount: uniqueIssues.filter((i) => i.severity === "MEDIUM").length,
        lowCount: uniqueIssues.filter((i) => i.severity === "LOW").length,
        sopScore: latestRun ? latestRun.sopScore : 100,
        summary: latestRun?.summaryMarkdown,
        issues: uniqueIssues.map((iss) => ({
          id: iss.id,
          reviewRunId: iss.reviewRunId,
          filePath: iss.filePath,
          lineNumber: iss.lineNumber,
          lineType: iss.lineType as any,
          severity: iss.severity as any,
          category: iss.category as any,
          title: iss.title,
          description: iss.description,
          suggestedFix: iss.suggestedFix || undefined,
          bitbucketCommentId: iss.bitbucketCommentId ? iss.bitbucketCommentId.toString() : undefined,
          isPosted: iss.isPosted,
          isFalsePositive: (iss as any).isFalsePositive ?? false,
          createdAt: iss.createdAt.toISOString(),
        })),
        reviewRuns: dbPr.reviewRuns.map((r) => ({
          id: r.id,
          pullRequestId: r.pullRequestId,
          commitHash: r.commitHash,
          summaryMarkdown: r.summaryMarkdown,
          totalIssues: r.totalIssues,
          criticalCount: r.criticalCount,
          highCount: r.highCount,
          mediumCount: r.mediumCount,
          lowCount: r.lowCount,
          sopScore: r.sopScore,
          rawLlmResponse: (r.rawLlmResponse || undefined) as any,
          createdAt: r.createdAt.toISOString(),
        })),
        createdAt: dbPr.createdAt.toISOString(),
        updatedAt: dbPr.updatedAt.toISOString(),
      };
    }
  } catch (err) {
    console.error("Database lookup error for PR detail:", err);
  }

  if (!pr) {
    notFound();
  }

  const issues = pr.issues ?? [];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header Info */}
      <PrDetailHeader pr={pr} />

      {/* Sticky Senior Decision Action Bar */}
      <SeniorActionBar pr={pr} />

      {/* AI Recommendation & SOP Compliance Score Banner */}
      <AiRecommendationBanner pr={pr} />

      {/* Interactive Tabs Workspace */}
      <Tabs defaultValue="diff" className="w-full space-y-4">
        <TabsList className="h-10 w-full justify-start border bg-muted/60 p-1">
          <TabsTrigger value="diff" className="gap-1.5 px-3 text-xs">
            <Code2 className="size-3.5" />
            Workspace Diff &amp; Review
            {typeof pr.filesChangedCount === "number" && pr.filesChangedCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[10px]">
                {pr.filesChangedCount} berkas
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="issues" className="gap-1.5 px-3 text-xs">
            <ListFilter className="size-3.5" />
            Daftar Temuan Isu
            <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[10px]">
              {issues.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="sop" className="gap-1.5 px-3 text-xs">
            <ShieldCheck className="size-3.5" />
            Kepatuhan SOP
            <Badge
              variant="outline"
              className={`px-1.5 py-0 font-mono text-[10px] ${
                pr.sopScore >= 80 ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {pr.sopScore}%
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="runs" className="gap-1.5 px-3 text-xs">
            <History className="size-3.5" />
            Riwayat Analisis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diff" className="mt-0 focus-visible:outline-none">
          <CodeDiffViewer pr={pr} />
        </TabsContent>

        <TabsContent value="issues" className="mt-0 focus-visible:outline-none">
          <IssuesTab issues={issues} bitbucketPrId={pr.bitbucketPrId} prId={pr.id} />
        </TabsContent>

        <TabsContent value="sop" className="mt-0 focus-visible:outline-none">
          <SopComplianceTab pr={pr} />
        </TabsContent>

        <TabsContent value="runs" className="mt-0 focus-visible:outline-none">
          <ReviewRunsTab pr={pr} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
