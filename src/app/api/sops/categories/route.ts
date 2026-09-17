import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.sopCategory.findMany({
      include: {
        _count: {
          select: { sops: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      colorBadge: cat.colorBadge,
      totalSops: cat._count.sops,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    }));

    return apiSuccess(formatted, "Daftar kategori SOP berhasil dimuat");
  } catch (error) {
    console.error("[API GET /sops/categories error]:", error);
    return apiError("Gagal mengambil data kategori SOP", "DATABASE_ERROR", String(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, description, colorBadge } = body;

    if (!name || !slug) {
      return apiError("Field 'name' dan 'slug' wajib diisi", "VALIDATION_ERROR", [], 400);
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, "-");

    const existing = await prisma.sopCategory.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return apiError(`Kategori dengan slug '${cleanSlug}' sudah ada`, "DUPLICATE_SLUG", [], 409);
    }

    const created = await prisma.sopCategory.create({
      data: {
        name: name.trim(),
        slug: cleanSlug,
        description: description?.trim() || null,
        colorBadge: colorBadge || "indigo",
      },
    });

    return apiSuccess(
      {
        id: created.id,
        name: created.name,
        slug: created.slug,
        description: created.description,
        colorBadge: created.colorBadge,
        totalSops: 0,
        createdAt: created.createdAt.toISOString(),
      },
      "Kategori SOP berhasil dibuat",
      undefined,
      201,
    );
  } catch (error) {
    console.error("[API POST /sops/categories error]:", error);
    return apiError("Gagal membuat kategori SOP baru", "DATABASE_ERROR", String(error), 500);
  }
}
