import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const whereClause: Record<string, unknown> = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { projectKey: { contains: search, mode: "insensitive" } },
      ];
    }

    const repos = await prisma.repository.findMany({
      where: whereClause,
      include: {
        pullRequests: {
          select: { id: true, prStatus: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = repos.map((repo) => {
      const openPrs = repo.pullRequests.filter((pr) => pr.prStatus === "OPEN").length;
      return {
        id: repo.id,
        projectKey: repo.projectKey,
        slug: repo.slug,
        name: repo.name,
        isActive: repo.isActive,
        defaultBranch: "main",
        openPrCount: openPrs,
        lastSyncAt: repo.updatedAt.toISOString(),
        createdAt: repo.createdAt.toISOString(),
        updatedAt: repo.updatedAt.toISOString(),
      };
    });

    return apiSuccess(formatted, "Daftar repositori berhasil diambil");
  } catch (error) {
    console.error("[API GET /repositories error]:", error);
    return apiError("Gagal mengambil data repositori", "DATABASE_ERROR", String(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectKey, slug, name, isActive } = body;

    if (!projectKey || !slug || !name) {
      return apiError("Field projectKey, slug, dan name wajib diisi", "VALIDATION_ERROR", [], 400);
    }

    const existing = await prisma.repository.findUnique({
      where: {
        projectKey_slug: {
          projectKey: projectKey.toUpperCase().trim(),
          slug: slug.toLowerCase().trim(),
        },
      },
    });

    if (existing) {
      return apiError("Repositori dengan Project Key dan Slug ini sudah terdaftar", "CONFLICT", [], 409);
    }

    const repo = await prisma.repository.create({
      data: {
        projectKey: projectKey.toUpperCase().trim(),
        slug: slug.toLowerCase().trim(),
        name: name.trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return apiSuccess(repo, "Repositori berhasil didaftarkan", undefined, 201);
  } catch (error) {
    console.error("[API POST /repositories error]:", error);
    return apiError("Gagal mendaftarkan repositori", "DATABASE_ERROR", String(error), 500);
  }
}
