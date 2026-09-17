import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { bitbucketClient } from "@/server/bitbucket/client";

export async function POST(req: NextRequest) {
  try {
    let body: {
      projectKey?: string;
      repositorySlug?: string;
      state?: "OPEN" | "MERGED" | "DECLINED" | "ALL";
      syncAll?: boolean;
    } = {};

    try {
      body = await req.json();
    } catch {
      // Empty body is allowed, defaults to syncing all repositories or active
    }

    const prState = body.state || "OPEN";

    // 1. Determine target repositories
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
    const errors: { repo: string; error: string }[] = [];

    // 2. Fetch and synchronize PRs from Bitbucket Server for each repository
    for (const repo of targetRepos) {
      try {
        const bitbucketPrs = await bitbucketClient.getPullRequests(repo.projectKey, repo.slug, prState, 50);

        for (const bbPr of bitbucketPrs) {
          totalSynced++;
          const authorName = bbPr.author?.user?.displayName || bbPr.author?.user?.name || "Developer";
          const authorSlug = bbPr.author?.user?.name || "developer";
          const sourceBranch = bbPr.fromRef?.id || "unknown";
          const targetBranch = bbPr.toRef?.id || "main";
          const latestCommit = bbPr.fromRef?.latestCommit || "unknown";
          const version = bbPr.version || 0;
          const status = bbPr.state || "OPEN";

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
                prStatus: status,
                aiReviewStatus: "NOT_STARTED",
              },
            });
          } else {
            updatedCount++;
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
                prStatus: status,
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

    return apiSuccess(
      {
        totalSynced,
        newCreated,
        updatedCount,
        repoCount: targetRepos.length,
        errors,
      },
      `Sinkronisasi manual selesai. ${newCreated} PR baru didaftarkan, ${updatedCount} PR diperbarui dari Bitbucket Server.`,
    );
  } catch (error) {
    console.error("[POST /api/bitbucket/sync-prs error]:", error);
    return apiError("Gagal menjalankan sinkronisasi manual pull request", "SYNC_ERROR", String(error), 500);
  }
}
