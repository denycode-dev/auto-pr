import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, isActive, projectKey, slug } = body;

    const existing = await prisma.repository.findUnique({ where: { id } });
    if (!existing) {
      return apiError(`Repositori '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    const newProjectKey = projectKey ? projectKey.toUpperCase().trim() : existing.projectKey;
    const newSlug = slug ? slug.toLowerCase().trim() : existing.slug;

    // Check conflict if projectKey or slug changed
    if (newProjectKey !== existing.projectKey || newSlug !== existing.slug) {
      const conflict = await prisma.repository.findUnique({
        where: {
          projectKey_slug: { projectKey: newProjectKey, slug: newSlug },
        },
      });
      if (conflict && conflict.id !== id) {
        return apiError(
          `Repositori dengan Project Key '${newProjectKey}' dan Slug '${newSlug}' sudah ada`,
          "CONFLICT",
          [],
          409,
        );
      }
    }

    const updated = await prisma.repository.update({
      where: { id },
      data: {
        projectKey: newProjectKey,
        slug: newSlug,
        name:
          name !== undefined
            ? name
            : newProjectKey !== existing.projectKey || newSlug !== existing.slug
              ? `${newProjectKey} / ${newSlug}`
              : existing.name,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    return apiSuccess(updated, "Repositori berhasil diperbarui");
  } catch (error) {
    console.error("[API PUT /repositories/:id error]:", error);
    return apiError("Gagal memperbarui repositori", "DATABASE_ERROR", String(error), 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.repository.findUnique({ where: { id } });
    if (!existing) {
      return apiError(`Repositori '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    await prisma.repository.delete({ where: { id } });

    return apiSuccess({ id }, "Repositori berhasil dihapus");
  } catch (error) {
    console.error("[API DELETE /repositories/:id error]:", error);
    return apiError("Gagal menghapus repositori", "DATABASE_ERROR", String(error), 500);
  }
}
