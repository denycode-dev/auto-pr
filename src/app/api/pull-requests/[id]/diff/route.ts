import type { NextRequest } from "next/server";

import type { ReviewIssue } from "@/data/code-review/types";
import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { bitbucketClient } from "@/server/bitbucket/client";
import { calculateDiffStats, deduplicateIssues, parseUnifiedDiffForViewer } from "@/server/review/diff-filter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
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

    let rawDiff = pr.cachedDiff || "";

    // On-Demand Two-Stage Diff Cache (BR-04)
    if (!rawDiff || rawDiff.trim().length === 0) {
      try {
        rawDiff = await bitbucketClient.getPullRequestDiff(
          pr.repository.projectKey,
          pr.repository.slug,
          pr.bitbucketPrId,
        );

        if (rawDiff && rawDiff.trim().length > 0) {
          const stats = calculateDiffStats(rawDiff);
          await prisma.pullRequest.update({
            where: { id: pr.id },
            data: {
              cachedDiff: rawDiff,
              filesChangedCount: stats.filesChanged,
              additionsCount: stats.additions,
              deletionsCount: stats.deletions,
            },
          });
        }
      } catch (diffErr) {
        console.warn(`[DiffAPI] Gagal mengambil diff dari Bitbucket Server untuk PR #${pr.bitbucketPrId}:`, diffErr);
      }
    }

    const allIssuesRaw = pr.reviewRuns.flatMap((r) => r.issues);
    const uniqueIssues = deduplicateIssues(allIssuesRaw);
    const issues: ReviewIssue[] = uniqueIssues.map((iss) => ({
      id: iss.id,
      reviewRunId: iss.reviewRunId,
      filePath: iss.filePath,
      lineNumber: iss.lineNumber,
      lineType: iss.lineType as "ADDED" | "CONTEXT",
      severity: iss.severity as ReviewIssue["severity"],
      category: iss.category,
      title: iss.title,
      description: iss.description,
      suggestedFix: iss.suggestedFix,
      bitbucketCommentId: iss.bitbucketCommentId ? iss.bitbucketCommentId.toString() : undefined,
      isPosted: iss.isPosted,
      isFalsePositive: Boolean((iss as { isFalsePositive?: boolean }).isFalsePositive),
      createdAt: iss.createdAt.toISOString(),
    }));

    // Parse unified diff into rich file, hunk, and line structures
    const parsedFiles = parseUnifiedDiffForViewer(rawDiff, issues);

    return apiSuccess({ files: parsedFiles }, "Diff Pull Request berhasil dimuat");
  } catch (error) {
    console.error("[API GET /pull-requests/:id/diff error]:", error);
    return apiError("Gagal memuat diff pull request", "DIFF_ERROR", String(error), 500);
  }
}
