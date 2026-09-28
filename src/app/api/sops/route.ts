import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const scope = searchParams.get("scope"); // 'GLOBAL' | 'REPOSITORY' | 'ALL'
    const repositoryId = searchParams.get("repositoryId");
    const enabledOnly = searchParams.get("enabledOnly") === "true";

    const whereClause: Record<string, unknown> = {};

    if (categoryId && categoryId !== "ALL") {
      whereClause.categoryId = categoryId;
    }

    if (scope && scope !== "ALL") {
      whereClause.scope = scope;
    }

    if (repositoryId && repositoryId !== "ALL") {
      whereClause.repositoryId = repositoryId;
    }

    if (enabledOnly) {
      whereClause.isEnabled = true;
    }

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam, 10));
      const limit = Math.max(1, Math.min(100, parseInt(limitParam || "10", 10)));
      const skip = (page - 1) * limit;

      const [total, sops] = await Promise.all([
        prisma.codingSop.count({ where: whereClause }),
        prisma.codingSop.findMany({
          where: whereClause,
          include: {
            category: true,
            repository: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
      ]);

      const formatted = sops.map((sop) => ({
        id: sop.id,
        title: sop.title,
        categoryId: sop.categoryId,
        category: sop.category
          ? {
              id: sop.category.id,
              name: sop.category.name,
              slug: sop.category.slug,
              description: sop.category.description,
              colorBadge: sop.category.colorBadge,
            }
          : undefined,
        scope: sop.scope,
        repositoryId: sop.repositoryId,
        repository: sop.repository
          ? {
              id: sop.repository.id,
              projectKey: sop.repository.projectKey,
              slug: sop.repository.slug,
              name: sop.repository.name,
            }
          : null,
        summary: sop.summary,
        rulesMarkdown: sop.rulesMarkdown,
        isEnabled: sop.isEnabled,
        createdBy: sop.createdBy,
        createdAt: sop.createdAt.toISOString(),
        updatedAt: sop.updatedAt.toISOString(),
      }));

      return apiSuccess(formatted, "Daftar Coding SOPs berhasil diambil", {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }

    const sops = await prisma.codingSop.findMany({
      where: whereClause,
      include: {
        category: true,
        repository: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = sops.map((sop) => ({
      id: sop.id,
      title: sop.title,
      categoryId: sop.categoryId,
      category: sop.category
        ? {
            id: sop.category.id,
            name: sop.category.name,
            slug: sop.category.slug,
            description: sop.category.description,
            colorBadge: sop.category.colorBadge,
          }
        : undefined,
      scope: sop.scope,
      repositoryId: sop.repositoryId,
      repository: sop.repository
        ? {
            id: sop.repository.id,
            projectKey: sop.repository.projectKey,
            slug: sop.repository.slug,
            name: sop.repository.name,
          }
        : null,
      summary: sop.summary,
      rulesMarkdown: sop.rulesMarkdown,
      isEnabled: sop.isEnabled,
      createdBy: sop.createdBy,
      createdAt: sop.createdAt.toISOString(),
      updatedAt: sop.updatedAt.toISOString(),
    }));

    return apiSuccess(formatted, "Daftar Coding SOPs berhasil diambil");
  } catch (error) {
    console.error("[API GET /sops error]:", error);
    return apiError("Gagal mengambil data Coding SOPs", "DATABASE_ERROR", String(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, categoryId, scope, repositoryId, summary, rulesMarkdown, isEnabled, createdBy } = body;

    if (!title || !categoryId || !rulesMarkdown) {
      return apiError("Field 'title', 'categoryId', dan 'rulesMarkdown' wajib diisi", "VALIDATION_ERROR", [], 400);
    }

    // Verify category exists
    const category = await prisma.sopCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return apiError(`Kategori dengan ID '${categoryId}' tidak ditemukan`, "CATEGORY_NOT_FOUND", [], 404);
    }

    const finalScope = scope === "REPOSITORY" ? "REPOSITORY" : "GLOBAL";
    const finalRepoId = finalScope === "REPOSITORY" && repositoryId ? repositoryId : null;

    const newSop = await prisma.codingSop.create({
      data: {
        title: title.trim(),
        categoryId,
        scope: finalScope,
        repositoryId: finalRepoId,
        summary: summary?.trim() || null,
        rulesMarkdown,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        createdBy: createdBy || "Senior Engineer",
      },
      include: {
        category: true,
        repository: true,
      },
    });

    revalidatePath("/dashboard/sops");
    revalidatePath("/dashboard/pull-requests");

    return apiSuccess(
      {
        id: newSop.id,
        title: newSop.title,
        scope: newSop.scope,
        categoryId: newSop.categoryId,
        category: newSop.category,
        repositoryId: newSop.repositoryId,
        repository: newSop.repository,
        summary: newSop.summary,
        rulesMarkdown: newSop.rulesMarkdown,
        isEnabled: newSop.isEnabled,
        createdBy: newSop.createdBy,
        createdAt: newSop.createdAt.toISOString(),
        updatedAt: newSop.updatedAt.toISOString(),
      },
      "Aturan SOP berhasil disimpan",
      undefined,
      201,
    );
  } catch (error) {
    console.error("[API POST /sops error]:", error);
    return apiError("Gagal menyimpan Coding SOP", "DATABASE_ERROR", String(error), 500);
  }
}
