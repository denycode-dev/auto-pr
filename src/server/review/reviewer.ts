import prisma from "@/lib/prisma";
import { getAiClient } from "@/server/ai/client";
import { bitbucketClient } from "@/server/bitbucket/client";
import { incrementModelUsage } from "@/server/db/settings";

import {
  calculateDiffStats,
  deduplicateIssues,
  isDuplicateIssue,
  isLineInChangedDiff,
  parseAndFilterDiff,
  sanitizeIssueDescription,
} from "./diff-filter";
import { buildHybridSopContext } from "./sop-engine";

export { deduplicateIssues, isDuplicateIssue, sanitizeIssueDescription };

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

export interface ExecuteAiReviewOptions {
  providerId?: string;
  model?: string;
  freshScan?: boolean;
}

/**
 * Execute automated code review on a pull request using OpenAI SDK on-demand (BR-02, BR-05, BR-06)
 */
export async function executeAiReview(
  pullRequestInternalId: string,
  forceRefreshDiff = false,
  options?: ExecuteAiReviewOptions,
) {
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
    }

    if (!rawDiff || rawDiff.trim().length === 0) {
      throw new Error(`Diff tidak ditemukan atau gagal diambil dari Bitbucket Server untuk PR #${pr.bitbucketPrId}`);
    }

    const isFreshScan = options?.freshScan ?? true;

    // 2. Fetch all previous issues for this PR to prevent duplicate comments
    const previousRuns = await prisma.reviewRun.findMany({
      where: { pullRequestId: pr.id },
      include: {
        issues: {
          select: {
            id: true,
            filePath: true,
            lineNumber: true,
            severity: true,
            category: true,
            title: true,
            description: true,
            isPosted: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const allPreviousIssues = previousRuns.flatMap((r) => r.issues);
    const postedPreviousIssues = allPreviousIssues.filter((i) => i.isPosted);
    // If freshScan is true (default for re-evaluation), only suppress issues already published to Bitbucket
    const issuesToSuppress = isFreshScan ? postedPreviousIssues : allPreviousIssues;

    // 3. Parse & sanitize diff: exclude binary, lockfiles, minified files, coverage dumps, and files without additions (BR-05)
    const parsedDiff = parseAndFilterDiff(rawDiff);
    const analyzableFiles = parsedDiff.files.filter((f) => !f.isIgnored && f.addedLines.length > 0);
    const analyzableDiffChunks = analyzableFiles.map((f) => f.diffContent).join("\n\n");

    const changedLinesSummary = analyzableFiles
      .map((f) => {
        const lineNums = f.addedLines.map((l) => l.lineNumber).sort((a, b) => a - b);
        const ranges: string[] = [];
        let start = lineNums[0];
        let prev = lineNums[0];
        for (let i = 1; i <= lineNums.length; i++) {
          if (lineNums[i] === prev + 1) {
            prev = lineNums[i];
          } else {
            ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
            start = lineNums[i];
            prev = lineNums[i];
          }
        }
        return `• ${f.filePath}: baris baru [${ranges.join(", ")}]`;
      })
      .join("\n");

    // 4. Fetch local repo SOP from Bitbucket
    const localSopContent = await bitbucketClient.getRepoLocalSop(
      pr.repository.projectKey,
      pr.repository.slug,
      pr.sourceBranch,
    );

    // 5. Build hybrid SOP context (Global + Repository Specific) (BR-10)
    const sopContext = await buildHybridSopContext(localSopContent, pr.repositoryId);

    // 6. Build prompt and invoke OpenAI SDK Gateway (BR-06)
    const systemPrompt = `
Anda adalah Principal Code Reviewer & Security Architect. Tugas Anda adalah mengevaluasi perubahan kode git (diff) secara mendalam, objektif, dan terstruktur.

Fokus evaluasi:
1. Keamanan Kode (SQL Injection, XSS, Secret Hardcoding, Replay Attacks, Timing Attacks)
2. Kesalahan Logika & Potensi Bug Fatal (Null pointer, Race condition, Unhandled promise)
3. Regresi Performa & Kebocoran Memori (Unbounded concurrency, Memory leak, N+1 query)
4. Kepatuhan terhadap Standar SOP Tim:
${sopContext.combinedGuidelinesPrompt}

ATURAN EVALUASI STANDAR SOP:
- Anda WAJIB memeriksa kepatuhan baris diff terhadap seluruh aturan SOP yang tertera di atas.
- Jika ditemukan pelanggaran aturan SOP, gunakan category: 'SOP_VIOLATION' dan sebutkan nama aturan SOP secara spesifik pada judul ('title') atau uraian masalah ('description').
- Evaluasi kode murni berdasarkan aturan SOP terkini di atas.

ATURAN SANGAT KETAT CAKUPAN EVALUASI (DIFF-ONLY SCOPING - WAJIB DIPATUHI):
1. Anda HANYA diperbolehkan menganalisis dan melaporkan isu pada baris kode yang BARU DITAMBAHKAN atau DIUBAH (baris dengan awalan '+' dalam git diff).
2. DILARANG KERAS mengevaluasi, mengkritik, atau melaporkan isu pada baris kode yang TIDAK BERUBAH (baris konteks yang diawali spasi ' ') ataupun baris yang dihapus ('-').
3. Nilai 'lineNumber' pada output issues HARUS merupakan nomor baris baru yang nyata-nyata berada pada baris bertanda '+' (lineType: 'ADDED').
4. Jangan pernah melaporkan isu pada berkas yang tidak memiliki baris penambahan/perubahan kode.

ATURAN GAYA BAHASA & STRUKTUR OUTPUT (WAJIB DIPATUHI):
- Gunakan Bahasa Indonesia yang mudah dipahami, terstruktur, ringkas, dan to the point.
- Hindari kata pengantar basa-basi ("Kami melihat bahwa...", "Perlu diperhatikan...").
- Format deskripsi setiap issue HARUS terstruktur rapi dengan poin berikut (JANGAN menambahkan baris lokasi file/baris lagi di dalam deskripsi karena lokasi sudah otomatis tercatat pada filePath dan lineNumber):
  ⚠️ **Masalah:** 1-2 kalimat padat mengenai inti kesalahan logika/keamanan/SOP.
  ⚡ **Dampak:** risiko teknis nyata (potensi error runtime, celah injeksi, data leak, dsb.).
  💡 **Solusi:** arahan perbaikan konkret.
- Berikan contoh perbaikan pada 'suggestedFix' berupa potongan kode bersih dan siap pakai.

ATURAN OUTPUT (STRICT JSON OBJECT):
Wajib kembalikan format JSON persis sesuai skema berikut:
{
  "summary": "Ringkasan temuan keseluruhan dalam markdown yang padat, to the point, dan tanpa jargon model AI",
  "recommendedStatus": "RECOMMENDED_APPROVE" | "RECOMMENDED_NEEDS_WORK" | "RECOMMENDED_DECLINE",
  "sopScore": 0-100 (angka integer, 100 jika patuh sempurna, <80 jika ada pelanggaran atau celah keamanan),
  "issues": [
    {
      "filePath": "string path file persis seperti di git diff",
      "lineNumber": number (nomor baris baru yang ditambahkan/diubah),
      "lineType": "ADDED",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "category": "BUG" | "SECURITY" | "PERFORMANCE" | "SOP_VIOLATION" | "BEST_PRACTICE",
      "title": "Judul masalah singkat dan spesifik dalam Bahasa Indonesia",
      "description": "Uraian terstruktur (Masalah, Dampak, Solusi) dalam Bahasa Indonesia tanpa mengulang lokasi berkas",
      "suggestedFix": "Potongan kode perbaikan yang valid (opsional)"
    }
  ]
}
`.trim();

    const existingIssuesPromptSection =
      issuesToSuppress.length > 0
        ? `
DAFTAR TEMUAN/KOMENTAR YANG SUDAH TERBIT KE BITBUCKET (JANGAN LAPORKAN KEMBALI):
${issuesToSuppress
  .slice(0, 30)
  .map((i) => `- [${i.filePath}:${i.lineNumber}] ${i.title} (${i.category})`)
  .join("\n")}

INSTRUKSI KHUSUS:
Isu-isu di atas SUDAH terbit sebagai komentar di Bitbucket Server. Anda DILARANG melaporkan kembali isu yang sama pada baris-baris tersebut.
`.trim()
        : "";

    const userPrompt = `
Periksa perubahan kode (diff) berikut untuk PR #${pr.bitbucketPrId}: "${pr.title}"
Repositori: ${pr.repository.projectKey}/${pr.repository.slug}
Branch: ${pr.sourceBranch} -> ${pr.targetBranch}
Commit: ${pr.latestCommitHash}

DAFTAR BERKAS & BARIS YANG DITAMBAHKAN/DIUBAH (+):
${changedLinesSummary || "(Tidak ada baris penambahan kode)"}

${existingIssuesPromptSection}

\`\`\`diff
${analyzableDiffChunks || rawDiff}
\`\`\`
`.trim();

    const { client, model, providerId, providerName } = await getAiClient(options);
    const requestTimeout = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 240000;

    // Track model usage frequency
    void incrementModelUsage(providerId, model);

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
      },
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

    const rawIssues = Array.isArray(aiResult.issues) ? aiResult.issues : [];

    // Filter 0: Internal deduplication within AI's own response
    const internallyDeduplicated = deduplicateIssues(rawIssues);

    // Filter 1: Must be strictly on a changed/added line in the diff (BR-05 & Scoping)
    const changedDiffIssues = internallyDeduplicated.filter((issue) => {
      const isChanged = isLineInChangedDiff(issue.filePath, issue.lineNumber || 1, parsedDiff);
      if (!isChanged) {
        console.log(
          `[ReviewEngine] Menolak isu pada ${issue.filePath}:${issue.lineNumber} - tidak berada pada baris diff yang ditambahkan/diubah.`,
        );
      }
      return isChanged;
    });

    // Filter 2: Must not duplicate issues already posted or suppressed
    const finalNewIssues = changedDiffIssues.filter((issue) => {
      const isDup = isDuplicateIssue(issue, issuesToSuppress);
      if (isDup) {
        console.log(
          `[ReviewEngine] Menolak isu duplikat pada ${issue.filePath}:${issue.lineNumber} (${issue.title}) - sudah tercatat/terbit sebelumnya.`,
        );
      }
      return !isDup;
    });

    // Calculate severity metrics from finalNewIssues
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const issue of finalNewIssues) {
      if (issue.severity === "CRITICAL") criticalCount++;
      else if (issue.severity === "HIGH") highCount++;
      else if (issue.severity === "MEDIUM") mediumCount++;
      else if (issue.severity === "LOW") lowCount++;
    }

    // Determine clean summary and status
    let finalSummary = aiResult.summary || "Analisis AI selesai.";
    let finalStatus = aiResult.recommendedStatus;
    let finalSopScore = typeof aiResult.sopScore === "number" ? Math.min(100, Math.max(0, aiResult.sopScore)) : 85;

    if (issuesToSuppress.length > 0 && finalNewIssues.length === 0) {
      finalSummary =
        "Pemindaian AI ulang selesai: Tidak ditemukan isu baru pada baris kode yang diubah (diff). Seluruh temuan sebelumnya telah tercatat atau kode perubahan memenuhi standar SOP.";
      finalStatus = "RECOMMENDED_APPROVE";
      finalSopScore = 100;
    } else if (finalNewIssues.length === 0 && rawIssues.length > 0) {
      finalSummary = "Analisis AI selesai: Tidak ada temuan isu baru pada baris kode yang diubah (diff).";
      finalStatus = "RECOMMENDED_APPROVE";
      finalSopScore = 100;
    }

    // 7. Save ReviewRun into database
    const reviewRun = await prisma.reviewRun.create({
      data: {
        pullRequestId: pr.id,
        commitHash: pr.latestCommitHash,
        summaryMarkdown: finalSummary,
        totalIssues: finalNewIssues.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        sopScore: finalSopScore,
        rawLlmResponse: {
          ...aiResult,
          issues: finalNewIssues,
          filteredOutCount: rawIssues.length - finalNewIssues.length,
          providerId,
          providerName,
          model,
        } as unknown as object,
      },
    });

    // 8. Save ONLY finalNewIssues into database as draft with sanitized descriptions
    for (const issue of finalNewIssues) {
      await prisma.reviewIssue.create({
        data: {
          reviewRunId: reviewRun.id,
          filePath: issue.filePath,
          lineNumber: issue.lineNumber || 1,
          lineType: issue.lineType || "ADDED",
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: sanitizeIssueDescription(issue.description),
          suggestedFix: issue.suggestedFix || null,
          bitbucketCommentId: null,
          isPosted: false,
        },
      });
    }

    // 9. Update PullRequest status in DB
    await prisma.pullRequest.update({
      where: { id: pr.id },
      data: {
        aiReviewStatus: "COMPLETED",
        aiRecommendation: finalStatus,
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

/**
 * Publish approved AI review issues and summary to Bitbucket Server (Requires User Approval)
 */
export async function publishAiReviewToBitbucket(
  pullRequestId: string,
  targetIssueIds?: string[],
): Promise<{
  success: boolean;
  publishedCount: number;
  totalIssues: number;
}> {
  const pr = await prisma.pullRequest.findUnique({
    where: { id: pullRequestId },
    include: {
      repository: true,
      reviewRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { issues: true },
      },
    },
  });

  if (!pr?.reviewRuns[0]) {
    throw new Error(`PullRequest atau ReviewRun untuk ID '${pullRequestId}' tidak ditemukan`);
  }

  const latestRun = pr.reviewRuns[0];
  // Filter issues that are NOT marked as false positive
  let issuesToPost = latestRun.issues.filter((iss) => !iss.isFalsePositive);

  // If specific issueIds are passed, restrict to only those (allowing re-post)
  if (targetIssueIds && targetIssueIds.length > 0) {
    const targetSet = new Set(targetIssueIds);
    issuesToPost = issuesToPost.filter((iss) => targetSet.has(iss.id));
  } else {
    // If bulk general publish, only post unposted issues
    issuesToPost = issuesToPost.filter((iss) => !iss.isPosted);
  }

  let publishedCount = 0;

  const severityEmojiMap: Record<string, string> = {
    CRITICAL: "🚨",
    HIGH: "⚠️",
    MEDIUM: "🟡",
    LOW: "🔵",
  };

  // 1. Post unposted inline comments with 80ms throttle
  for (const issue of issuesToPost) {
    const ext = issue.filePath.split(".").pop() || "typescript";
    const severityEmoji = severityEmojiMap[issue.severity] || "ℹ️";
    const cleanDesc = sanitizeIssueDescription(issue.description);

    const commentText = `### [AI Review] ${severityEmoji} **${issue.title}** (\`${issue.severity}\` | \`${issue.category}\`)

📍 **Lokasi:** \`${issue.filePath}:${issue.lineNumber}\`

${cleanDesc}${issue.suggestedFix ? `\n\n\`\`\`${ext}\n// Rekomendasi perbaikan:\n${issue.suggestedFix}\n\`\`\`` : ""}`;

    try {
      const bbComment = await bitbucketClient.postComment(
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
        },
      );

      if (bbComment?.id) {
        await prisma.reviewIssue.update({
          where: { id: issue.id },
          data: {
            bitbucketCommentId: BigInt(bbComment.id),
            isPosted: true,
          },
        });
        publishedCount++;
      }
    } catch (postErr) {
      console.warn(
        `[ReviewEngine] Gagal memposting inline comment untuk ${issue.filePath}:${issue.lineNumber}:`,
        postErr,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  // 2. Post general summary comment to Bitbucket PR if general publish or first time
  if ((!targetIssueIds || targetIssueIds.length === 0) && publishedCount > 0) {
    try {
      const summaryComment = `## 🤖 Hasil Evaluasi Kualitas Kode — Disetujui Senior Reviewer
**Rekomendasi AI:** \`${pr.aiRecommendation || "NEEDS_WORK"}\` | **Skor Kepatuhan SOP:** \`${latestRun.sopScore}%\`

### Ringkasan Temuan:
- 🚨 **Kritis:** ${latestRun.criticalCount}
- 🔴 **Tinggi:** ${latestRun.highCount}
- 🟡 **Sedang:** ${latestRun.mediumCount}
- 🔵 **Rendah:** ${latestRun.lowCount}

${latestRun.summaryMarkdown}
`;

      await bitbucketClient.postComment(pr.repository.projectKey, pr.repository.slug, pr.bitbucketPrId, {
        text: summaryComment,
      });
    } catch (summaryErr) {
      console.warn("[ReviewEngine] Gagal memposting komentar ringkasan ke Bitbucket:", summaryErr);
    }
  }

  return {
    success: true,
    publishedCount,
    totalIssues: latestRun.issues.length,
  };
}
