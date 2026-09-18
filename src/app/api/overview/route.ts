import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalPrs,
      openPrs,
      completedPrs,
      approvedPrs,
      needsWorkPrs,
      declinedPrs,
      reviewRuns,
      recentPrs,
      recApprove,
      recNeedsWork,
      recDecline,
      severityGroups,
      rawIssues,
    ] = await Promise.all([
      prisma.pullRequest.count(),
      prisma.pullRequest.count({ where: { prStatus: "OPEN" } }),
      prisma.pullRequest.count({ where: { aiReviewStatus: "COMPLETED" } }),
      prisma.pullRequest.count({ where: { seniorDecision: { in: ["APPROVED", "APPROVE"] } } }),
      prisma.pullRequest.count({ where: { seniorDecision: "NEEDS_WORK" } }),
      prisma.pullRequest.count({ where: { seniorDecision: { in: ["DECLINED", "DECLINE"] } } }),
      prisma.reviewRun.findMany({
        select: {
          sopScore: true,
        },
      }),
      prisma.pullRequest.findMany({
        where: { prStatus: "OPEN" },
        include: {
          repository: true,
          reviewRuns: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.pullRequest.count({ where: { aiRecommendation: "RECOMMENDED_APPROVE" } }),
      prisma.pullRequest.count({ where: { aiRecommendation: "RECOMMENDED_NEEDS_WORK" } }),
      prisma.pullRequest.count({ where: { aiRecommendation: "RECOMMENDED_DECLINE" } }),
      prisma.reviewIssue.groupBy({
        by: ["severity"],
        _count: { id: true },
        where: { isFalsePositive: false },
      }),
      prisma.reviewIssue.findMany({
        where: { isFalsePositive: false },
        select: {
          id: true,
          title: true,
          filePath: true,
          lineNumber: true,
          severity: true,
          category: true,
          createdAt: true,
          reviewRun: {
            select: {
              pullRequest: {
                select: {
                  id: true,
                  bitbucketPrId: true,
                  title: true,
                  repository: {
                    select: {
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Calculate aggregated metrics from real database rows
    const decidedCount = approvedPrs + needsWorkPrs + declinedPrs;
    const approvalRate = decidedCount > 0 ? Math.round((approvedPrs / decidedCount) * 100) : 0;

    let totalSopScore = 0;
    for (const run of reviewRuns) {
      totalSopScore += run.sopScore;
    }
    const avgSopScore = reviewRuns.length > 0 ? Math.round(totalSopScore / reviewRuns.length) : 0;

    // Real severity count map from review_issues
    const severityCountMap: Record<string, number> = {};
    for (const group of severityGroups) {
      severityCountMap[group.severity] = group._count.id;
    }

    const totalCritical = severityCountMap.CRITICAL || 0;
    const totalHigh = severityCountMap.HIGH || 0;
    const totalMedium = severityCountMap.MEDIUM || 0;
    const totalLow = severityCountMap.LOW || 0;
    const totalInfo = severityCountMap.INFO || 0;

    // Senior agreement rate with AI: PRs where senior decision matched AI recommendation
    const agreedPrs = await prisma.pullRequest.count({
      where: {
        OR: [
          { aiRecommendation: "RECOMMENDED_APPROVE", seniorDecision: { in: ["APPROVED", "APPROVE"] } },
          { aiRecommendation: "RECOMMENDED_NEEDS_WORK", seniorDecision: "NEEDS_WORK" },
          { aiRecommendation: "RECOMMENDED_DECLINE", seniorDecision: { in: ["DECLINED", "DECLINE"] } },
        ],
      },
    });
    const agreementRate = decidedCount > 0 ? Math.round((agreedPrs / decidedCount) * 100) : 0;

    // Coverage rate
    const coverageRate = totalPrs > 0 ? Math.round((completedPrs / totalPrs) * 100) : 0;

    const recommendationDistribution = [
      { name: "Approve", value: recApprove, color: "var(--color-emerald-500, #10b981)" },
      { name: "Needs Work", value: recNeedsWork, color: "var(--color-amber-500, #f59e0b)" },
      { name: "Decline", value: recDecline, color: "var(--color-rose-500, #f43f5e)" },
    ];

    const severityBreakdown = [
      { severity: "CRITICAL", count: totalCritical, color: "bg-rose-500" },
      { severity: "HIGH", count: totalHigh, color: "bg-orange-500" },
      { severity: "MEDIUM", count: totalMedium, color: "bg-amber-500" },
      { severity: "LOW", count: totalLow, color: "bg-blue-500" },
      { severity: "INFO", count: totalInfo, color: "bg-sky-500" },
    ];

    const severityWeight: Record<string, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };

    const recentIssues = rawIssues
      .sort((a, b) => {
        const weightDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 15)
      .map((issue) => ({
        id: issue.id,
        title: issue.title,
        filePath: issue.filePath,
        lineNumber: issue.lineNumber,
        severity: issue.severity,
        category: issue.category,
        createdAt: issue.createdAt.toISOString(),
        prId: issue.reviewRun.pullRequest.id,
        prBitbucketId: issue.reviewRun.pullRequest.bitbucketPrId,
        prTitle: issue.reviewRun.pullRequest.title,
        repoSlug: issue.reviewRun.pullRequest.repository?.slug || "",
      }));

    const activeQueue = recentPrs.map((pr) => {
      const latestRun = pr.reviewRuns[0];
      return {
        id: pr.id,
        bitbucketPrId: pr.bitbucketPrId,
        projectKey: pr.repository.projectKey,
        repositorySlug: pr.repository.slug,
        title: pr.title,
        authorName: pr.authorName,
        aiRecommendation: pr.aiRecommendation || "PENDING",
        criticalCount: latestRun?.criticalCount || 0,
        sopScore: latestRun?.sopScore || 0,
        updatedAt: pr.updatedAt.toISOString(),
      };
    });

    return apiSuccess({
      metrics: {
        activePrCount: openPrs,
        totalPrCount: totalPrs,
        analyzedPrCount: completedPrs,
        approvalRate,
        criticalIssueCount: totalCritical,
        avgSopScore,
        agreementRate,
        coverageRate,
        totalIssuesCount: rawIssues.length,
      },
      recommendationDistribution,
      severityBreakdown,
      recentIssues,
      activeQueue,
    });
  } catch (error) {
    console.error("[API GET /overview error]:", error);
    return apiError("Gagal mengambil metrik overview", "DATABASE_ERROR", String(error), 500);
  }
}
