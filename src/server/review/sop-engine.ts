import prisma from "@/lib/prisma";

export interface SopContext {
  globalSopsText: string;
  repositorySopsText: string;
  localSopText: string;
  combinedGuidelinesPrompt: string;
  totalActiveSops: number;
}

/**
 * Fetch enabled Global SOPs and Repository-specific SOPs from PostgreSQL,
 * combined with repository-level Local SOP from git branch (BR-10 & BR-05)
 */
export async function buildHybridSopContext(
  localSopContent?: string | null,
  repositoryId?: string,
): Promise<SopContext> {
  const whereConditions: Record<string, unknown>[] = [{ isEnabled: true, scope: "GLOBAL" }];

  if (repositoryId) {
    whereConditions.push({
      isEnabled: true,
      scope: "REPOSITORY",
      repositoryId,
    });
  }

  const sops = await prisma.codingSop.findMany({
    where: { OR: whereConditions },
    include: {
      category: true,
      repository: true,
    },
    orderBy: [{ scope: "asc" }, { createdAt: "asc" }],
  });

  const globalSops = sops.filter((s) => s.scope === "GLOBAL");
  const repoSops = sops.filter((s) => s.scope === "REPOSITORY");

  let globalSopsText = "Tidak ada SOP Global yang aktif.";
  if (globalSops.length > 0) {
    globalSopsText = globalSops
      .map(
        (sop, idx) =>
          `### [SOP Global ${idx + 1}] Kategori: ${sop.category.name} | ${sop.title}\n${
            sop.summary ? `*Ringkasan:* ${sop.summary}\n\n` : ""
          }${sop.rulesMarkdown}`,
      )
      .join("\n\n");
  }

  let repositorySopsText = "Tidak ada SOP Khusus Repositori yang aktif.";
  if (repoSops.length > 0) {
    repositorySopsText = repoSops
      .map(
        (sop, idx) =>
          `### [SOP Repositori ${idx + 1}] Kategori: ${sop.category.name} | ${sop.title}\n${
            sop.summary ? `*Ringkasan:* ${sop.summary}\n\n` : ""
          }${sop.rulesMarkdown}`,
      )
      .join("\n\n");
  }

  const localSopText =
    localSopContent && localSopContent.trim().length > 0
      ? localSopContent.trim()
      : "Tidak ada file .review-rules.md pada branch sumber repositori.";

  const combinedGuidelinesPrompt = `
--- 1. ORGANIZATIONAL GLOBAL SOP (Berlaku Lintas Sistem) ---
${globalSopsText}

--- 2. REPOSITORY SPECIFIC SOP (Ditetapkan untuk Repositori ini) ---
${repositorySopsText}

--- 3. REPOSITORY LOCAL FILE (.review-rules.md pada branch git) ---
${localSopText}

PRIORITAS ATURAN (BR-05 & BR-10):
Jika ada aturan yang saling melengkapi atau memiliki spesifikasi lebih ketat pada SOP Repositori atau Local File (.review-rules.md), prioritaskan standar spesifik repositori tersebut dibanding SOP Global umum.
`.trim();

  return {
    globalSopsText,
    repositorySopsText,
    localSopText,
    combinedGuidelinesPrompt,
    totalActiveSops: sops.length,
  };
}
