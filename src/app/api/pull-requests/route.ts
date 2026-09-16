import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // 'OPEN' | 'MERGED' | 'DECLINED'
    const recommendation = searchParams.get("recommendation");
    const projectKey = searchParams.get("projectKey");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      whereClause.prStatus = status;
    }
    if (recommendation && recommendation !== "ALL") {
      whereClause.aiRecommendation = recommendation;
    }
    if (projectKey && projectKey !== "ALL") {
      whereClause.repository = { projectKey };
    }
    if (search) {
      const searchConditions: any[] = [
        { title: { contains: search, mode: "insensitive" } },
        { authorName: { contains: search, mode: "insensitive" } },
        { sourceBranch: { contains: search, mode: "insensitive" } },
        { targetBranch: { contains: search, mode: "insensitive" } },
      ];
      const parsedNum = Number.parseInt(search, 10);
      if (!Number.isNaN(parsedNum)) {
        searchConditions.push({ bitbucketPrId: parsedNum });
      }
      whereClause.OR = searchConditions;
    }

    const [total, pullRequests] = await Promise.all([
      prisma.pullRequest.count({ where: whereClause }),
      prisma.pullRequest.findMany({
        where: whereClause,
        include: {
          repository: true,
          reviewRuns: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              issues: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formattedPrs = pullRequests.map((pr) => {
      const latestRun = pr.reviewRuns[0];
      const issues = latestRun?.issues || [];

      return {
        id: pr.id,
        repositoryId: pr.repositoryId,
        projectKey: pr.repository.projectKey,
        repositorySlug: pr.repository.slug,
        bitbucketPrId: pr.bitbucketPrId,
        title: pr.title,
        authorName: pr.authorName,
        authorSlug: pr.authorSlug,
        sourceBranch: pr.sourceBranch,
        targetBranch: pr.targetBranch,
        latestCommitHash: pr.latestCommitHash,
        bitbucketVersion: pr.bitbucketVersion,
        prStatus: pr.prStatus,
        aiReviewStatus: pr.aiReviewStatus,
        aiRecommendation: pr.aiRecommendation,
        seniorDecision: pr.seniorDecision || "PENDING",
        seniorNotes: pr.seniorNotes,
        decidedAt: pr.decidedAt?.toISOString(),
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
        createdAt: pr.createdAt.toISOString(),
        updatedAt: pr.updatedAt.toISOString(),
      };
    });

    return apiSuccess(formattedPrs, "Daftar pull request berhasil diambil", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[API GET /pull-requests error]:", error);
    return apiError("Gagal mengambil data pull request", "DATABASE_ERROR", String(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      repositoryId,
      projectKey,
      repositorySlug,
      bitbucketPrId,
      title,
      authorName,
      authorSlug,
      sourceBranch,
      targetBranch,
      latestCommitHash,
    } = body;

    let targetRepoId = repositoryId;

    if (!targetRepoId && projectKey && repositorySlug) {
      let repo = await prisma.repository.findUnique({
        where: { projectKey_slug: { projectKey, slug: repositorySlug } },
      });
      if (!repo) {
        repo = await prisma.repository.create({
          data: {
            projectKey,
            slug: repositorySlug,
            name: `${projectKey} / ${repositorySlug}`,
          },
        });
      }
      targetRepoId = repo.id;
    }

    if (!targetRepoId || !bitbucketPrId || !title || !sourceBranch || !targetBranch || !latestCommitHash) {
      return apiError(
        "Parameter repository, bitbucketPrId, title, sourceBranch, targetBranch, dan latestCommitHash wajib diisi",
        "VALIDATION_ERROR",
        [],
        400
      );
    }

    const pr = await prisma.pullRequest.create({
      data: {
        repositoryId: targetRepoId,
        bitbucketPrId: Number(bitbucketPrId),
        title: title.trim(),
        authorName: authorName ? authorName.trim() : "Developer",
        authorSlug: authorSlug ? authorSlug.trim() : "developer",
        sourceBranch: sourceBranch.trim(),
        targetBranch: targetBranch.trim(),
        latestCommitHash: latestCommitHash.trim(),
        prStatus: "OPEN",
        aiReviewStatus: "PENDING",
      },
    });

    return apiSuccess(pr, "Pull request berhasil didaftarkan", undefined, 201);
  } catch (error) {
    console.error("[API POST /pull-requests error]:", error);
    return apiError("Gagal mendaftarkan pull request", "DATABASE_ERROR", String(error), 500);
  }
}
