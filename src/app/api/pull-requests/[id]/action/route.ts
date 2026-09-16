import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { bitbucketClient } from "@/server/bitbucket/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, notes } = body; // action: "APPROVE" | "NEEDS_WORK" | "DECLINE"

    if (!["APPROVE", "NEEDS_WORK", "DECLINE"].includes(action)) {
      return apiError(
        "Aksi tidak valid. Pilihan yang diperbolehkan: APPROVE, NEEDS_WORK, DECLINE",
        "VALIDATION_ERROR",
        [],
        400
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const numericId = Number(id);
    const isNumeric = !Number.isNaN(numericId);

    if (!isUuid && !isNumeric) {
      return apiError(`Pull request '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    const pr = await prisma.pullRequest.findFirst({
      where: isUuid ? { id } : { bitbucketPrId: numericId },
      include: { repository: true },
    });

    if (!pr) {
      return apiError(`Pull request '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    const projectKey = pr.repository.projectKey;
    const repositorySlug = pr.repository.slug;
    const bitbucketPrId = pr.bitbucketPrId;

    let syncResult: { success: boolean; data?: unknown; error?: string };
    let newPrStatus = pr.prStatus;

    if (action === "APPROVE") {
      syncResult = await bitbucketClient.approvePullRequest(projectKey, repositorySlug, bitbucketPrId);
      if (notes && notes.trim()) {
        await bitbucketClient.postComment(projectKey, repositorySlug, bitbucketPrId, {
          text: `### 🧑‍💼 Catatan Approval Senior Engineer:\n\n${notes.trim()}`,
        });
      }
    } else if (action === "NEEDS_WORK") {
      syncResult = await bitbucketClient.setNeedsWork(projectKey, repositorySlug, bitbucketPrId);
      if (notes && notes.trim()) {
        await bitbucketClient.postComment(projectKey, repositorySlug, bitbucketPrId, {
          text: `### ⚠️ Revisi Diperlukan (Needs Work) — Catatan Senior Engineer:\n\n${notes.trim()}`,
        });
      }
    } else {
      // DECLINE
      syncResult = await bitbucketClient.declinePullRequest(
        projectKey,
        repositorySlug,
        bitbucketPrId,
        pr.bitbucketVersion
      );
      newPrStatus = "DECLINED";
      if (notes && notes.trim()) {
        await bitbucketClient.postComment(projectKey, repositorySlug, bitbucketPrId, {
          text: `### 🚫 Pull Request Ditolak (Declined) — Alasan Senior Engineer:\n\n${notes.trim()}`,
        });
      }
    }

    if (!syncResult.success) {
      return apiError(
        `Gagal menyinkronkan keputusan '${action}' ke Bitbucket Server: ${syncResult.error || "Remote sync failed"}`,
        "BITBUCKET_SYNC_ERROR",
        syncResult,
        502
      );
    }

    const decidedAt = new Date();
    const updatedPr = await prisma.pullRequest.update({
      where: { id: pr.id },
      data: {
        prStatus: newPrStatus,
        seniorDecision: action,
        seniorNotes: notes || null,
        decidedAt,
      },
    });

    return apiSuccess(
      {
        pullRequestId: updatedPr.id,
        bitbucketPrId: updatedPr.bitbucketPrId,
        bitbucketStatus: action,
        seniorDecision: updatedPr.seniorDecision,
        decidedAt: decidedAt.toISOString(),
        remoteSync: syncResult,
      },
      `Aksi '${action}' berhasil disinkronisasi ke Bitbucket Server dan database`
    );
  } catch (error) {
    console.error("[API POST /pull-requests/:id/action error]:", error);
    return apiError("Gagal mengeksekusi keputusan Senior", "BITBUCKET_SYNC_ERROR", String(error), 500);
  }
}
