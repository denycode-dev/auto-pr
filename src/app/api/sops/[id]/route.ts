import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const sop = await prisma.codingSop.findUnique({
      where: { id },
      include: {
        category: true,
        repository: true,
      },
    });

    if (!sop) {
      return apiError(`SOP dengan ID '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    return apiSuccess(
      {
        id: sop.id,
        title: sop.title,
        categoryId: sop.categoryId,
        category: sop.category,
        scope: sop.scope,
        repositoryId: sop.repositoryId,
        repository: sop.repository,
        summary: sop.summary,
        rulesMarkdown: sop.rulesMarkdown,
        isEnabled: sop.isEnabled,
        createdBy: sop.createdBy,
        createdAt: sop.createdAt.toISOString(),
        updatedAt: sop.updatedAt.toISOString(),
      },
      "Detail SOP berhasil diambil"
    );
  } catch (error) {
    console.error("[API GET /sops/:id error]:", error);
    return apiError("Gagal mengambil detail SOP", "DATABASE_ERROR", String(error), 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, categoryId, scope, repositoryId, summary, rulesMarkdown, isEnabled } = body;

    const existing = await prisma.codingSop.findUnique({ where: { id } });
    if (!existing) {
      return apiError(`SOP dengan ID '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    if (categoryId && categoryId !== existing.categoryId) {
      const catExists = await prisma.sopCategory.findUnique({ where: { id: categoryId } });
      if (!catExists) {
        return apiError(`Kategori dengan ID '${categoryId}' tidak ditemukan`, "CATEGORY_NOT_FOUND", [], 404);
      }
    }

    const finalScope = scope !== undefined ? (scope === "REPOSITORY" ? "REPOSITORY" : "GLOBAL") : existing.scope;
    const finalRepoId = finalScope === "REPOSITORY" ? (repositoryId !== undefined ? repositoryId : existing.repositoryId) : null;

    const updated = await prisma.codingSop.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
        scope: finalScope,
        repositoryId: finalRepoId,
        summary: summary !== undefined ? summary?.trim() || null : existing.summary,
        rulesMarkdown: rulesMarkdown !== undefined ? rulesMarkdown : existing.rulesMarkdown,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : existing.isEnabled,
      },
      include: {
        category: true,
        repository: true,
      },
    });

    return apiSuccess(
      {
        id: updated.id,
        title: updated.title,
        categoryId: updated.categoryId,
        category: updated.category,
        scope: updated.scope,
        repositoryId: updated.repositoryId,
        repository: updated.repository,
        summary: updated.summary,
        rulesMarkdown: updated.rulesMarkdown,
        isEnabled: updated.isEnabled,
        createdBy: updated.createdBy,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      "Coding SOP berhasil diperbarui"
    );
  } catch (error) {
    console.error("[API PUT /sops/:id error]:", error);
    return apiError("Gagal memperbarui Coding SOP", "DATABASE_ERROR", String(error), 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.codingSop.findUnique({ where: { id } });
    if (!existing) {
      return apiError(`SOP dengan ID '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    await prisma.codingSop.delete({ where: { id } });

    return apiSuccess({ id }, "Coding SOP berhasil dihapus");
  } catch (error) {
    console.error("[API DELETE /sops/:id error]:", error);
    return apiError("Gagal menghapus Coding SOP", "DATABASE_ERROR", String(error), 500);
  }
}
