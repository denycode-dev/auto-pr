import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { type BitbucketPullRequestResponse, bitbucketClient } from "@/server/bitbucket/client";
import { getDynamicSystemConfig } from "@/server/db/settings";

interface ReviewResolution {
  prStatus: string;
  seniorDecision: "APPROVED" | "NEEDS_WORK" | "DECLINED" | "PENDING";
  approverName?: string;
}

function extractBitbucketReviewStatus(bbPr: BitbucketPullRequestResponse, seniorUserSlug?: string): ReviewResolution {
  const prStatus = bbPr.state || "OPEN";

  if (prStatus === "DECLINED") {
    return {
      prStatus: "DECLINED",
      seniorDecision: "DECLINED",
    };
  }

  if (prStatus === "MERGED") {
    return {
      prStatus: "MERGED",
      seniorDecision: "APPROVED",
    };
  }

  const allReviewers = [
    ...(Array.isArray(bbPr.reviewers) ? bbPr.reviewers : []),
    ...(Array.isArray(bbPr.participants) ? bbPr.participants : []),
  ];

  // 1. Check if configured senior lead user specifically reviewed
  if (seniorUserSlug && seniorUserSlug.trim()) {
    const slug = seniorUserSlug.trim().toLowerCase();
    const senior = allReviewers.find(
      (r) => r.user?.name?.toLowerCase() === slug || r.user?.slug?.toLowerCase() === slug,
    );
    if (senior) {
      if (senior.approved === true || senior.status === "APPROVED") {
        return {
          prStatus: "OPEN",
          seniorDecision: "APPROVED",
          approverName: senior.user?.displayName || senior.user?.name,
        };
      }
      if (senior.status === "NEEDS_WORK") {
        return {
          prStatus: "OPEN",
          seniorDecision: "NEEDS_WORK",
          approverName: senior.user?.displayName || senior.user?.name,
        };
      }
    }
  }

  // 2. Check if ANY reviewer or participant approved in Bitbucket
  const approvedReviewer = allReviewers.find((r) => r.approved === true || r.status === "APPROVED");
  if (approvedReviewer) {
    return {
      prStatus: "OPEN",
      seniorDecision: "APPROVED",
      approverName: approvedReviewer.user?.displayName || approvedReviewer.user?.name,
    };
  }

  // 3. Check if ANY reviewer requested changes (NEEDS_WORK)
  const needsWorkReviewer = allReviewers.find((r) => r.status === "NEEDS_WORK");
  if (needsWorkReviewer) {
    return {
      prStatus: "OPEN",
      seniorDecision: "NEEDS_WORK",
      approverName: needsWorkReviewer.user?.displayName || needsWorkReviewer.user?.name,
    };
  }

  return {
    prStatus: "OPEN",
    seniorDecision: "PENDING",
  };
}

export async function POST(req: NextRequest) {
  try {
    let body: {
      projectKey?: string;
      repositorySlug?: string;
      state?: "OPEN" | "MERGED" | "DECLINED" | "ALL";
      syncAll?: boolean;
      syncOnlyExisting?: boolean;
    } = {};

    try {
      body = await req.json();
    } catch {
      // Empty body is allowed, defaults to syncing all repositories or active
    }

    const prState = body.state || "OPEN";
    const dynamicConfig = await getDynamicSystemConfig();
    const seniorUserSlug = dynamicConfig.bitbucket.seniorUserSlug;

    // Mode 1: syncOnlyExisting (dipakai tombol Refresh di antrean PR)
    // Hanya memperbarui status dari PR yang SUDAH ADA di database lokal.
    // Tidak akan menarik PR baru yang belum di-review, dan tidak akan menimpa aiReviewStatus yang sudah ada.
    if (body.syncOnlyExisting) {
      const prWhereClause: Record<string, unknown> = {};
      if (body.projectKey && body.repositorySlug) {
        prWhereClause.repository = {
          projectKey: body.projectKey.toUpperCase().trim(),
          slug: body.repositorySlug.toLowerCase().trim(),
        };
      }

      const existingPrs = await prisma.pullRequest.findMany({
        where: prWhereClause,
        include: { repository: true },
      });

      if (existingPrs.length === 0) {
        return apiSuccess(
          { totalSynced: 0, newCreated: 0, updatedCount: 0, statusUpdatedCount: 0 },
          "Belum ada pull request di antrean untuk diperbarui.",
        );
      }

      let totalSynced = 0;
      let updatedCount = 0;
      let statusUpdatedCount = 0;

      for (const pr of existingPrs) {
        try {
          const bbPr = await bitbucketClient.getPullRequest(
            pr.repository.projectKey,
            pr.repository.slug,
            pr.bitbucketPrId,
          );

          if (!bbPr) continue;

          totalSynced++;
          const statusDecision = extractBitbucketReviewStatus(bbPr, seniorUserSlug);

          // Jangan menimpa status keputusan yang sudah ada jika di Bitbucket belum ada keputusan eksplisit baru
          let finalSeniorDecision = pr.seniorDecision;
          if (statusDecision.seniorDecision !== "PENDING") {
            finalSeniorDecision = statusDecision.seniorDecision;
          }

          let decidedAt = pr.decidedAt;
          if (finalSeniorDecision !== "PENDING" && !decidedAt) {
            decidedAt = bbPr.updatedDate ? new Date(bbPr.updatedDate) : new Date();
          }

          const isStatusChanged = pr.prStatus !== statusDecision.prStatus || pr.seniorDecision !== finalSeniorDecision;
          if (isStatusChanged) {
            statusUpdatedCount++;
          }

          await prisma.pullRequest.update({
            where: { id: pr.id },
            data: {
              title: bbPr.title || pr.title,
              authorName: bbPr.author?.user?.displayName || bbPr.author?.user?.name || pr.authorName,
              authorSlug: bbPr.author?.user?.name || pr.authorSlug,
              sourceBranch: bbPr.fromRef?.id || pr.sourceBranch,
              targetBranch: bbPr.toRef?.id || pr.targetBranch,
              latestCommitHash: bbPr.fromRef?.latestCommit || pr.latestCommitHash,
              bitbucketVersion: bbPr.version || pr.bitbucketVersion,
              prStatus: statusDecision.prStatus,
              seniorDecision: finalSeniorDecision,
              decidedAt,
              seniorNotes:
                pr.seniorNotes ||
                (statusDecision.approverName && finalSeniorDecision === "APPROVED"
                  ? `Disetujui di Bitbucket Server oleh ${statusDecision.approverName}`
                  : undefined),
            },
          });
          updatedCount++;
        } catch (prErr) {
          console.warn(`[SyncExisting] Error updating PR #${pr.bitbucketPrId}:`, prErr);
        }
      }

      let message = `Status ${updatedCount} pull request di antrean berhasil disinkronkan dari Bitbucket Server.`;
      if (statusUpdatedCount > 0) {
        message = `${statusUpdatedCount} status persetujuan pull request berhasil diperbarui dari Bitbucket Server.`;
      }

      return apiSuccess(
        {
          totalSynced,
          newCreated: 0,
          updatedCount,
          statusUpdatedCount,
          errors: [],
        },
        message,
      );
    }

    // Mode 2: Full sync / Import baru (dipakai dari dialog Tarik PR)
    let targetRepos: { id: string; projectKey: string; slug: string; name: string }[] = [];

    if (body.projectKey && body.repositorySlug) {
      const pKey = body.projectKey.toUpperCase().trim();
      const slug = body.repositorySlug.toLowerCase().trim();

      let repo = await prisma.repository.findUnique({
        where: { projectKey_slug: { projectKey: pKey, slug } },
      });

      if (!repo) {
        // If not found by composite unique, check if a repository exists with the same slug
        const existingBySlug = await prisma.repository.findFirst({
          where: { slug },
        });

        if (existingBySlug) {
          // Heal existing repository to use the correct projectKey
          repo = await prisma.repository.update({
            where: { id: existingBySlug.id },
            data: {
              projectKey: pKey,
              name: `${pKey} / ${slug}`,
              isActive: true,
            },
          });
        } else {
          repo = await prisma.repository.create({
            data: {
              projectKey: pKey,
              slug,
              name: `${pKey} / ${slug}`,
              isActive: true,
            },
          });
        }
      }
      targetRepos = [repo];
    } else {
      // Sync all active repositories in database
      const existingRepos = await prisma.repository.findMany({
        where: { isActive: true },
      });

      if (existingRepos.length === 0) {
        return apiError(
          "Belum ada repositori aktif yang terdaftar di database untuk disinkronkan. Masukkan Project Key dan Repo Slug atau daftarkan repositori terlebih dahulu.",
          "NO_REPOSITORIES_FOUND",
          [],
          400,
        );
      }
      targetRepos = existingRepos;
    }

    let totalSynced = 0;
    let newCreated = 0;
    let updatedCount = 0;
    let statusUpdatedCount = 0;
    const errors: { repo: string; error: string }[] = [];

    // 2. Fetch and synchronize PRs from Bitbucket Server for each repository
    for (const repo of targetRepos) {
      try {
        const bitbucketPrs = await bitbucketClient.getPullRequests(repo.projectKey, repo.slug, prState, 50);

        // Also check any currently OPEN PRs in DB for this repo that might have merged/declined or fallen out of top list
        const openPrsInDb = await prisma.pullRequest.findMany({
          where: {
            repositoryId: repo.id,
            prStatus: "OPEN",
          },
        });

        const fetchedBitbucketPrIds = new Set(bitbucketPrs.map((p) => p.id));
        const missingOpenPrs = openPrsInDb.filter((p) => !fetchedBitbucketPrIds.has(p.bitbucketPrId));

        for (const missingPr of missingOpenPrs) {
          try {
            const singleBbPr = await bitbucketClient.getPullRequest(
              repo.projectKey,
              repo.slug,
              missingPr.bitbucketPrId,
            );
            if (singleBbPr) {
              bitbucketPrs.push(singleBbPr);
              fetchedBitbucketPrIds.add(singleBbPr.id);
            }
          } catch (err) {
            console.warn(`[Sync] Could not fetch missing PR #${missingPr.bitbucketPrId}:`, err);
          }
        }

        for (const bbPr of bitbucketPrs) {
          totalSynced++;
          const authorName = bbPr.author?.user?.displayName || bbPr.author?.user?.name || "Developer";
          const authorSlug = bbPr.author?.user?.name || "developer";
          const sourceBranch = bbPr.fromRef?.id || "unknown";
          const targetBranch = bbPr.toRef?.id || "main";
          const latestCommit = bbPr.fromRef?.latestCommit || "unknown";
          const version = bbPr.version || 0;

          const statusDecision = extractBitbucketReviewStatus(bbPr, seniorUserSlug);

          const existingPr = await prisma.pullRequest.findUnique({
            where: {
              repositoryId_bitbucketPrId: {
                repositoryId: repo.id,
                bitbucketPrId: bbPr.id,
              },
            },
          });

          if (!existingPr) {
            newCreated++;
            const decidedAt =
              statusDecision.seniorDecision !== "PENDING"
                ? bbPr.updatedDate
                  ? new Date(bbPr.updatedDate)
                  : new Date()
                : null;

            await prisma.pullRequest.create({
              data: {
                repositoryId: repo.id,
                bitbucketPrId: bbPr.id,
                title: bbPr.title || `Pull Request #${bbPr.id}`,
                authorName,
                authorSlug,
                sourceBranch,
                targetBranch,
                latestCommitHash: latestCommit,
                bitbucketVersion: version,
                prStatus: statusDecision.prStatus,
                seniorDecision: statusDecision.seniorDecision,
                decidedAt,
                seniorNotes:
                  statusDecision.approverName && statusDecision.seniorDecision === "APPROVED"
                    ? `Disetujui di Bitbucket Server oleh ${statusDecision.approverName}`
                    : null,
                aiReviewStatus: "NOT_STARTED",
              },
            });
          } else {
            updatedCount++;
            let finalSeniorDecision = existingPr.seniorDecision;
            if (statusDecision.seniorDecision !== "PENDING") {
              finalSeniorDecision = statusDecision.seniorDecision;
            }

            let decidedAt = existingPr.decidedAt;
            if (finalSeniorDecision !== "PENDING") {
              if (!decidedAt || existingPr.seniorDecision !== finalSeniorDecision) {
                decidedAt = bbPr.updatedDate ? new Date(bbPr.updatedDate) : new Date();
              }
            } else {
              decidedAt = null;
            }

            if (existingPr.seniorDecision !== finalSeniorDecision || existingPr.prStatus !== statusDecision.prStatus) {
              statusUpdatedCount++;
            }

            await prisma.pullRequest.update({
              where: { id: existingPr.id },
              data: {
                title: bbPr.title || existingPr.title,
                authorName,
                authorSlug,
                sourceBranch,
                targetBranch,
                latestCommitHash: latestCommit,
                bitbucketVersion: version,
                prStatus: statusDecision.prStatus,
                seniorDecision: finalSeniorDecision,
                decidedAt,
                seniorNotes:
                  existingPr.seniorNotes ||
                  (statusDecision.approverName && finalSeniorDecision === "APPROVED"
                    ? `Disetujui di Bitbucket Server oleh ${statusDecision.approverName}`
                    : undefined),
              },
            });
          }
        }
      } catch (repoErr) {
        console.error(`[ManualSync] Failed syncing ${repo.projectKey}/${repo.slug}:`, repoErr);
        errors.push({
          repo: `${repo.projectKey}/${repo.slug}`,
          error: repoErr instanceof Error ? repoErr.message : String(repoErr),
        });
      }
    }

    if (targetRepos.length === 1 && errors.length > 0) {
      return apiError(`Gagal menarik pull request: ${errors[0].error}`, "BITBUCKET_SYNC_ERROR", errors, 502);
    }

    let message = `Sinkronisasi selesai. ${newCreated} PR baru didaftarkan, ${updatedCount} PR diperbarui dari Bitbucket Server.`;
    if (statusUpdatedCount > 0) {
      message = `Sinkronisasi selesai. ${statusUpdatedCount} status pull request / code review diperbarui dari Bitbucket Server.`;
    }

    return apiSuccess(
      {
        totalSynced,
        newCreated,
        updatedCount,
        statusUpdatedCount,
        repoCount: targetRepos.length,
        errors,
      },
      message,
    );
  } catch (error) {
    console.error("[POST /api/bitbucket/sync-prs error]:", error);
    return apiError("Gagal menjalankan sinkronisasi manual pull request", "SYNC_ERROR", String(error), 500);
  }
}
