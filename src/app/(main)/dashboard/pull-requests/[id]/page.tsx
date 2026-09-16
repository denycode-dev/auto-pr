import { notFound } from "next/navigation";
import { AlertCircle, Code2, FileCode2, History, ListFilter, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import type { PullRequest } from "@/data/code-review/types";

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

export default async function PullRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  let pr: PullRequest | null = null;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const dbPr = await prisma.pullRequest.findFirst({
      where: isUuid
        ? { id }
        : {
            OR: [
              { id },
              { bitbucketPrId: isNaN(Number(id)) ? -1 : Number(id) },
            ],
          },
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
      const issues = latestRun?.issues || [];
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
        seniorDecision: (dbPr.seniorDecision || "PENDING") as any,
        seniorNotes: dbPr.seniorNotes || undefined,
        decidedAt: dbPr.decidedAt?.toISOString(),
        filesChangedCount: dbPr.filesChangedCount ?? 0,
        additionsCount: dbPr.additionsCount ?? 0,
        deletionsCount: dbPr.deletionsCount ?? 0,
        cachedDiff: dbPr.cachedDiff,
        cachedDiffHash: dbPr.cachedDiffHash,
        totalIssues: latestRun ? latestRun.totalIssues : 0,
        criticalCount: latestRun ? latestRun.criticalCount : 0,
        highCount: latestRun ? latestRun.highCount : 0,
        mediumCount: latestRun ? latestRun.mediumCount : 0,
        lowCount: latestRun ? latestRun.lowCount : 0,
        sopScore: latestRun ? latestRun.sopScore : 100,
        summary: latestRun?.summaryMarkdown,
        issues: issues.map((iss) => ({
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

  const issues = pr.issues || [];

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
        <TabsList className="w-full justify-start h-10 p-1 bg-muted/60 border">
          <TabsTrigger value="diff" className="text-xs gap-1.5 px-3">
            <Code2 className="size-3.5" />
            Workspace Diff &amp; Review
            {typeof pr.filesChangedCount === "number" && pr.filesChangedCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                {pr.filesChangedCount} berkas
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="issues" className="text-xs gap-1.5 px-3">
            <ListFilter className="size-3.5" />
            Daftar Temuan Isu
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
              {issues.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="sop" className="text-xs gap-1.5 px-3">
            <ShieldCheck className="size-3.5" />
            Kepatuhan SOP
            <Badge
              variant="outline"
              className={`px-1.5 py-0 text-[10px] font-mono ${
                pr.sopScore >= 80 ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {pr.sopScore}%
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="runs" className="text-xs gap-1.5 px-3">
            <History className="size-3.5" />
            Riwayat Analisis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diff" className="mt-0 focus-visible:outline-none">
          <CodeDiffViewer pr={pr} />
        </TabsContent>

        <TabsContent value="issues" className="mt-0 focus-visible:outline-none">
          <IssuesTab issues={issues} bitbucketPrId={pr.bitbucketPrId} />
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
