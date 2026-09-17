import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { publishAiReviewToBitbucket } from "@/server/review/reviewer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { issueId, issueIds, isFalsePositive } = body;

    if (typeof isFalsePositive !== "boolean") {
      return apiError("Parameter 'isFalsePositive' bertipe boolean wajib disertakan", "VALIDATION_ERROR", [], 400);
    }

    const idsToUpdate: string[] = [];
    if (typeof issueId === "string" && issueId.trim()) {
      idsToUpdate.push(issueId.trim());
    } else if (Array.isArray(issueIds)) {
      idsToUpdate.push(...issueIds.filter((i) => typeof i === "string" && i.trim()));
    }

    if (idsToUpdate.length === 0) {
      return apiError("Harus menyertakan 'issueId' atau 'issueIds'", "VALIDATION_ERROR", [], 400);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const numericId = Number(id);

    const pr = await prisma.pullRequest.findFirst({
      where: isUuid ? { id } : { bitbucketPrId: Number.isNaN(numericId) ? -1 : numericId },
      select: { id: true },
    });

    if (!pr) {
      return apiError(`Pull request '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    const result = await prisma.reviewIssue.updateMany({
      where: {
        id: { in: idsToUpdate },
        reviewRun: {
          pullRequestId: pr.id,
        },
      },
      data: {
        isFalsePositive,
      },
    });

    return apiSuccess(
      { updatedCount: result.count, isFalsePositive },
      `Berhasil memperbarui status verifikasi ${result.count} temuan issue`,
    );
  } catch (error) {
    console.error("[API PATCH /pull-requests/:id/issues error]:", error);
    return apiError("Gagal memperbarui status temuan issue", "DATABASE_ERROR", String(error), 500);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { issueId, issueIds } = body;

    const idsToPublish: string[] = [];
    if (typeof issueId === "string" && issueId.trim()) {
      idsToPublish.push(issueId.trim());
    } else if (Array.isArray(issueIds)) {
      idsToPublish.push(...issueIds.filter((i) => typeof i === "string" && i.trim()));
    }

    if (idsToPublish.length === 0) {
      return apiError(
        "Harus menyertakan 'issueId' atau daftar 'issueIds' yang ingin dikirim ke Bitbucket",
        "VALIDATION_ERROR",
        [],
        400,
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const numericId = Number(id);

    const pr = await prisma.pullRequest.findFirst({
      where: isUuid ? { id } : { bitbucketPrId: Number.isNaN(numericId) ? -1 : numericId },
    });

    if (!pr) {
      return apiError(`Pull request '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    const pubResult = await publishAiReviewToBitbucket(pr.id, idsToPublish);

    return apiSuccess(pubResult, `Berhasil mengirim ${pubResult.publishedCount} komentar temuan ke Bitbucket Server`);
  } catch (error) {
    console.error("[API POST /pull-requests/:id/issues error]:", error);
    return apiError("Gagal mengirim komentar ke Bitbucket Server", "BITBUCKET_SYNC_ERROR", String(error), 500);
  }
}
