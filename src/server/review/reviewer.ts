import prisma from "@/lib/prisma";
import { getAiClient } from "@/server/ai/client";
import { bitbucketClient } from "@/server/bitbucket/client";
import { calculateDiffStats, parseAndFilterDiff } from "./diff-filter";
import { buildHybridSopContext } from "./sop-engine";

export interface ReviewAiIssueOutput {
  filePath: string;
  lineNumber: number;
  lineType: "ADDED";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: "BUG" | "SECURITY" | "PERFORMANCE" | "SOP_VIOLATION" | "BEST_PRACTICE" | string;
  title: string;
  description: string;
  suggestedFix?: string;
}

export interface ReviewAiResponseFormat {
  summary: string;
  recommendedStatus: "RECOMMENDED_APPROVE" | "RECOMMENDED_NEEDS_WORK" | "RECOMMENDED_DECLINE";
  sopScore: number;
  issues: ReviewAiIssueOutput[];
}

/**
 * Execute automated code review on a pull request using OpenAI SDK on-demand (BR-02, BR-05, BR-06)
 */
export async function executeAiReview(pullRequestInternalId: string, forceRefreshDiff = false) {
  const pr = await prisma.pullRequest.findUnique({
    where: { id: pullRequestInternalId },
    include: { repository: true },
  });

  if (!pr) {
    throw new Error(`PullRequest with id ${pullRequestInternalId} not found`);
  }

  // Update status to IN_PROGRESS
  await prisma.pullRequest.update({
    where: { id: pr.id },
    data: { aiReviewStatus: "IN_PROGRESS" },
  });

  try {
    // 1. Fetch raw diff from Cache DB or Bitbucket Server (BR-04)
    let rawDiff = pr.cachedDiff;

    if (forceRefreshDiff || !rawDiff || rawDiff.trim().length === 0) {
      rawDiff = await bitbucketClient.getPullRequestDiff(
        pr.repository.projectKey,
        pr.repository.slug,
        pr.bitbucketPrId
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
    }

    if (!rawDiff || rawDiff.trim().length === 0) {
      throw new Error(`Diff tidak ditemukan atau gagal diambil dari Bitbucket Server untuk PR #${pr.bitbucketPrId}`);
    }

    // 2. Parse & sanitize diff: exclude binary, lockfiles, minified files (BR-05)
    const parsedDiff = parseAndFilterDiff(rawDiff);
    const analyzableDiffChunks = parsedDiff.files
      .filter((f) => !f.isIgnored)
      .map((f) => f.diffContent)
      .join("\n\n");

    // 3. Fetch local repo SOP from Bitbucket
    const localSopContent = await bitbucketClient.getRepoLocalSop(
      pr.repository.projectKey,
      pr.repository.slug,
      pr.sourceBranch
    );

    // 4. Build hybrid SOP context (Global + Repository Specific) (BR-10)
    const sopContext = await buildHybridSopContext(localSopContent, pr.repositoryId);

    // 5. Build prompt and invoke OpenAI SDK Gateway (BR-06)
    const systemPrompt = `
Anda adalah Principal Code Reviewer & Security Architect. Tugas Anda adalah mengevaluasi perubahan kode git (diff) secara mendalam, objektif, dan terstruktur.

Fokus evaluasi:
1. Keamanan Kode (SQL Injection, XSS, Secret Hardcoding, Replay Attacks, Timing Attacks)
2. Kesalahan Logika & Potensi Bug Fatal (Null pointer, Race condition, Unhandled promise)
3. Regresi Performa & Kebocoran Memori (Unbounded concurrency, Memory leak, N+1 query)
4. Kepatuhan terhadap Standar SOP Tim:
${sopContext.combinedGuidelinesPrompt}

ATURAN OUTPUT (STRICT JSON OBJECT):
Wajib kembalikan format JSON persis sesuai skema berikut:
{
  "summary": "Ringkasan temuan keseluruhan dalam markdown yang padat, humanis, dan tanpa jargon teknis gateway/model",
  "recommendedStatus": "RECOMMENDED_APPROVE" | "RECOMMENDED_NEEDS_WORK" | "RECOMMENDED_DECLINE",
  "sopScore": 0-100 (angka integer, 100 jika patuh sempurna, <80 jika ada pelanggaran atau celah keamanan),
  "issues": [
    {
      "filePath": "string path file persis seperti di git diff",
      "lineNumber": number (nomor baris baru yang ditambahkan/diubah),
      "lineType": "ADDED",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "category": "BUG" | "SECURITY" | "PERFORMANCE" | "SOP_VIOLATION" | "BEST_PRACTICE",
      "title": "Judul singkat masalah dalam Bahasa Indonesia",
      "description": "Uraian teknis mengapa baris ini bermasalah dan risiko yang ditimbulkan",
      "suggestedFix": "Potongan kode perbaikan yang valid (opsional)"
    }
  ]
}
`.trim();

    const userPrompt = `
Periksa perubahan kode (diff) berikut untuk PR #${pr.bitbucketPrId}: "${pr.title}"
Repositori: ${pr.repository.projectKey}/${pr.repository.slug}
Branch: ${pr.sourceBranch} -> ${pr.targetBranch}
Commit: ${pr.latestCommitHash}

\`\`\`diff
${analyzableDiffChunks || rawDiff}
\`\`\`
`.trim();

    const { client, model } = await getAiClient();
    const requestTimeout = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 240000;

    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      },
      {
        timeout: requestTimeout,
        maxRetries: 0,
      }
    );

    const responseContent = completion.choices[0]?.message?.content || "{}";
    let aiResult: ReviewAiResponseFormat;

    try {
      aiResult = JSON.parse(responseContent) as ReviewAiResponseFormat;
    } catch {
      aiResult = {
        summary: "Evaluasi kode selesai.",
        recommendedStatus: "RECOMMENDED_NEEDS_WORK",
        sopScore: 70,
        issues: [],
      };
    }

    // Calculate severity metrics
    const issues = Array.isArray(aiResult.issues) ? aiResult.issues : [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const issue of issues) {
      if (issue.severity === "CRITICAL") criticalCount++;
      else if (issue.severity === "HIGH") highCount++;
      else if (issue.severity === "MEDIUM") mediumCount++;
      else if (issue.severity === "LOW") lowCount++;
    }

    // 6. Save ReviewRun into database
    const reviewRun = await prisma.reviewRun.create({
      data: {
        pullRequestId: pr.id,
        commitHash: pr.latestCommitHash,
        summaryMarkdown: aiResult.summary || "Analisis AI selesai.",
        totalIssues: issues.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        sopScore: typeof aiResult.sopScore === "number" ? Math.min(100, Math.max(0, aiResult.sopScore)) : 85,
        rawLlmResponse: aiResult as unknown as object,
      },
    });

    // 7. Post inline comments to Bitbucket Server with Throttling (PRD 9.1: 80ms delay)
    for (const issue of issues) {
      const commentText = `### [AI Review] ${issue.severity === "CRITICAL" ? "🚨" : issue.severity === "HIGH" ? "⚠️" : "💡"} **${issue.title}** (${issue.category})\n\n${issue.description}${
        issue.suggestedFix ? `\n\n\`\`\`typescript\n// Rekomendasi perbaikan:\n${issue.suggestedFix}\n\`\`\`` : ""
      }`;

      let bbComment: { id: number; text: string } | null = null;

      try {
        bbComment = await bitbucketClient.postComment(
          pr.repository.projectKey,
          pr.repository.slug,
          pr.bitbucketPrId,
          {
            text: commentText,
            anchor: {
              diffType: "EFFECTIVE",
              line: issue.lineNumber || 1,
              lineType: "ADDED",
              fileType: "TO",
              path: issue.filePath,
              srcPath: issue.filePath,
            },
          }
        );
      } catch (postErr) {
        console.warn(`[ReviewEngine] Gagal memposting inline comment untuk ${issue.filePath}:${issue.lineNumber}:`, postErr);
      }

      await prisma.reviewIssue.create({
        data: {
          reviewRunId: reviewRun.id,
          filePath: issue.filePath,
          lineNumber: issue.lineNumber || 1,
          lineType: issue.lineType || "ADDED",
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          suggestedFix: issue.suggestedFix || null,
          bitbucketCommentId: bbComment?.id ? BigInt(bbComment.id) : null,
          isPosted: Boolean(bbComment?.id),
        },
      });

      // Throttle delay 80ms between API calls to protect enterprise Bitbucket Server (PRD 9.1)
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    // 8. Post general summary comment to Bitbucket PR
    try {
      const summaryComment = `## 🤖 Hasil Evaluasi Kualitas Kode — Iterasi \`${pr.latestCommitHash.substring(0, 8)}\`
**Rekomendasi:** \`${aiResult.recommendedStatus}\` | **Skor Kepatuhan SOP:** \`${reviewRun.sopScore}%\`

### Ringkasan Temuan:
- 🚨 **Kritis:** ${criticalCount}
- 🔴 **Tinggi:** ${highCount}
- 🟡 **Sedang:** ${mediumCount}
- 🟢 **Rendah / Saran:** ${lowCount}

${aiResult.summary}
`;

      await bitbucketClient.postComment(
        pr.repository.projectKey,
        pr.repository.slug,
        pr.bitbucketPrId,
        { text: summaryComment }
      );
    } catch (summaryErr) {
      console.warn("[ReviewEngine] Gagal memposting komentar ringkasan ke Bitbucket:", summaryErr);
    }

    // 9. Update PullRequest status in DB
    await prisma.pullRequest.update({
      where: { id: pr.id },
      data: {
        aiReviewStatus: "COMPLETED",
        aiRecommendation: aiResult.recommendedStatus,
      },
    });

    return reviewRun;
  } catch (err) {
    console.error(`[ReviewEngine] Error executing review for PR ${pullRequestInternalId}:`, err);

    await prisma.pullRequest.update({
      where: { id: pr.id },
      data: { aiReviewStatus: "FAILED" },
    });

    throw err;
  }
}
