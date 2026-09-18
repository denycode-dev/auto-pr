import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { executeAiReview } from "@/server/review/reviewer";

export const maxDuration = 300; // 5 minutes for comprehensive AI code review
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { providerId, model, forceRefreshDiff } = body || {};

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const numericId = Number(id);
    const isNumeric = !Number.isNaN(numericId);

    if (!isUuid && !isNumeric) {
      return apiError(`Pull request '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    const pr = await prisma.pullRequest.findFirst({
      where: isUuid ? { id } : { bitbucketPrId: numericId },
    });

    if (!pr) {
      return apiError(`Pull request '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    const reviewRun = await executeAiReview(pr.id, Boolean(forceRefreshDiff), {
      providerId: typeof providerId === "string" ? providerId : undefined,
      model: typeof model === "string" ? model : undefined,
    });

    return apiSuccess(
      {
        pullRequestId: pr.id,
        reviewRunId: reviewRun.id,
        totalIssues: reviewRun.totalIssues,
        sopScore: reviewRun.sopScore,
        createdAt: reviewRun.createdAt.toISOString(),
      },
      "Analisis AI review berhasil dieksekusi dan disimpan",
    );
  } catch (error) {
    console.error("[API POST /pull-requests/:id/trigger-review error]:", error);
    return apiError("Gagal menjalankan review AI", "REVIEW_EXECUTION_ERROR", String(error), 500);
  }
}
