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
    const { name, slug, description, colorBadge } = body;

    const existing = await prisma.sopCategory.findUnique({ where: { id } });
    if (!existing) {
      return apiError(`Kategori dengan ID '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    let cleanSlug = existing.slug;
    if (slug) {
      cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]/g, "-");

      const duplicate = await prisma.sopCategory.findFirst({
        where: { slug: cleanSlug, NOT: { id } },
      });

      if (duplicate) {
        return apiError(`Kategori dengan slug '${cleanSlug}' sudah digunakan`, "DUPLICATE_SLUG", [], 409);
      }
    }

    const updated = await prisma.sopCategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        slug: cleanSlug,
        description: description !== undefined ? description?.trim() || null : existing.description,
        colorBadge: colorBadge !== undefined ? colorBadge : existing.colorBadge,
      },
    });

    return apiSuccess(updated, "Kategori SOP berhasil diperbarui");
  } catch (error) {
    console.error("[API PUT /sops/categories/:id error]:", error);
    return apiError("Gagal memperbarui kategori SOP", "DATABASE_ERROR", String(error), 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.sopCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sops: true },
        },
      },
    });

    if (!existing) {
      return apiError(`Kategori dengan ID '${id}' tidak ditemukan`, "NOT_FOUND", [], 404);
    }

    if (existing._count.sops > 0) {
      return apiError(
        `Kategori '${existing.name}' tidak dapat dihapus karena masih digunakan oleh ${existing._count.sops} aturan SOP. Pindahkan atau hapus SOP tersebut terlebih dahulu.`,
        "RESTRICTED_DELETE",
        [],
        400,
      );
    }

    await prisma.sopCategory.delete({ where: { id } });

    return apiSuccess({ id }, "Kategori SOP berhasil dihapus");
  } catch (error) {
    console.error("[API DELETE /sops/categories/:id error]:", error);
    return apiError("Gagal menghapus kategori SOP", "DATABASE_ERROR", String(error), 500);
  }
}
