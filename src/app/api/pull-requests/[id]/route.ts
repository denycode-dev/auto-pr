import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { bitbucketClient } from "@/server/bitbucket/client";
import { calculateDiffStats } from "@/server/review/diff-filter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const numericId = Number(id);
    const isNumeric = !Number.isNaN(numericId);

    if (!isUuid && !isNumeric) {
      return apiError(`Pull request dengan identifier '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    const pr = await prisma.pullRequest.findFirst({
      where: isUuid ? { id } : { bitbucketPrId: numericId },
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

    if (!pr) {
      return apiError(`Pull request dengan identifier '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    // Two-Stage Review Pipeline: Cache diff if not yet stored (BR-04)
    let cachedDiff = pr.cachedDiff;
    let filesChanged = pr.filesChangedCount;
    let additions = pr.additionsCount;
    let deletions = pr.deletionsCount;

    if (!cachedDiff || cachedDiff.trim().length === 0) {
      try {
        const fetchedDiff = await bitbucketClient.getPullRequestDiff(
          pr.repository.projectKey,
          pr.repository.slug,
          pr.bitbucketPrId
        );

        if (fetchedDiff && fetchedDiff.trim().length > 0) {
          cachedDiff = fetchedDiff;
          const stats = calculateDiffStats(fetchedDiff);
          filesChanged = stats.filesChanged;
          additions = stats.additions;
          deletions = stats.deletions;

          await prisma.pullRequest.update({
            where: { id: pr.id },
            data: {
              cachedDiff: fetchedDiff,
              filesChangedCount: filesChanged,
              additionsCount: additions,
              deletionsCount: deletions,
            },
          });
        }
      } catch (diffErr) {
        console.warn(`[PRDetail] Gagal mengambil diff dari Bitbucket Server untuk PR #${pr.bitbucketPrId}:`, diffErr);
      }
    }

    const latestRun = pr.reviewRuns[0];
    const issues = latestRun?.issues || [];

    const responseData = {
      id: pr.id,
      repositoryId: pr.repositoryId,
      projectKey: pr.repository.projectKey,
      repositorySlug: pr.repository.slug,
      repository: {
        id: pr.repository.id,
        projectKey: pr.repository.projectKey,
        slug: pr.repository.slug,
        name: pr.repository.name,
      },
      bitbucketPrId: pr.bitbucketPrId,
      title: pr.title,
      author: {
        name: pr.authorName,
        username: pr.authorSlug,
      },
      authorName: pr.authorName,
      authorSlug: pr.authorSlug,
      sourceBranch: pr.sourceBranch,
      targetBranch: pr.targetBranch,
      latestCommitHash: pr.latestCommitHash,
      bitbucketVersion: pr.bitbucketVersion,
      prStatus: pr.prStatus,
      status: pr.prStatus,
      aiReviewStatus: pr.aiReviewStatus,
      aiRecommendation: pr.aiRecommendation,
      aiReview: {
        status: pr.aiReviewStatus,
        recommendation: pr.aiRecommendation,
        sopScore: latestRun ? latestRun.sopScore : null,
        summary: latestRun?.summaryMarkdown || null,
        totalIssues: latestRun ? latestRun.totalIssues : 0,
        scannedAt: latestRun ? latestRun.createdAt.toISOString() : null,
      },
      seniorDecision: {
        status: pr.seniorDecision || "PENDING",
        notes: pr.seniorNotes,
        decidedAt: pr.decidedAt?.toISOString() || null,
      },
      seniorNotes: pr.seniorNotes,
      decidedAt: pr.decidedAt?.toISOString(),
      diffStats: {
        filesChanged,
        additions,
        deletions,
      },
      hasCachedDiff: Boolean(cachedDiff && cachedDiff.trim().length > 0),
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
        lineType: iss.lineType,
        severity: iss.severity,
        category: iss.category,
        title: iss.title,
        description: iss.description,
        suggestedFix: iss.suggestedFix,
        bitbucketCommentId: iss.bitbucketCommentId ? iss.bitbucketCommentId.toString() : null,
        isPosted: iss.isPosted,
        createdAt: iss.createdAt.toISOString(),
      })),
      reviewRuns: pr.reviewRuns.map((r) => ({
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
        rawLlmResponse: r.rawLlmResponse,
        createdAt: r.createdAt.toISOString(),
      })),
      createdAt: pr.createdAt.toISOString(),
      updatedAt: pr.updatedAt.toISOString(),
    };

    return apiSuccess(responseData, "Detail Pull Request berhasil diambil");
  } catch (error) {
    console.error("[API GET /pull-requests/:id error]:", error);
    return apiError("Gagal mengambil detail pull request", "DATABASE_ERROR", String(error), 500);
  }
}
