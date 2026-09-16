import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";

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
    ] = await Promise.all([
      prisma.pullRequest.count(),
      prisma.pullRequest.count({ where: { prStatus: "OPEN" } }),
      prisma.pullRequest.count({ where: { aiReviewStatus: "COMPLETED" } }),
      prisma.pullRequest.count({ where: { seniorDecision: "APPROVED" } }),
      prisma.pullRequest.count({ where: { seniorDecision: "NEEDS_WORK" } }),
      prisma.pullRequest.count({ where: { seniorDecision: "DECLINED" } }),
      prisma.reviewRun.findMany({
        select: {
          criticalCount: true,
          highCount: true,
          mediumCount: true,
          lowCount: true,
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
    ]);

    // Calculate aggregated metrics from real database rows
    const decidedCount = approvedPrs + needsWorkPrs + declinedPrs;
    const approvalRate = decidedCount > 0 ? Math.round((approvedPrs / decidedCount) * 100) : 0;

    let totalCritical = 0;
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;
    let totalSopScore = 0;

    for (const run of reviewRuns) {
      totalCritical += run.criticalCount;
      totalHigh += run.highCount;
      totalMedium += run.mediumCount;
      totalLow += run.lowCount;
      totalSopScore += run.sopScore;
    }

    const avgSopScore =
      reviewRuns.length > 0 ? Math.round(totalSopScore / reviewRuns.length) : 0;

    // Senior agreement rate with AI: PRs where senior decision matched AI recommendation
    const agreedPrs = await prisma.pullRequest.count({
      where: {
        OR: [
          { aiRecommendation: "RECOMMENDED_APPROVE", seniorDecision: "APPROVED" },
          { aiRecommendation: "RECOMMENDED_NEEDS_WORK", seniorDecision: "NEEDS_WORK" },
          { aiRecommendation: "RECOMMENDED_DECLINE", seniorDecision: "DECLINED" },
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
    ];

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
      },
      recommendationDistribution,
      severityBreakdown,
      activeQueue,
    });
  } catch (error) {
    console.error("[API GET /overview error]:", error);
    return apiError("Gagal mengambil metrik overview", "DATABASE_ERROR", String(error), 500);
  }
}
