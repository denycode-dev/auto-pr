import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import type { CodingSop } from "@/data/code-review/types";
import { SopDualPaneEditor } from "../../_components/sop-dual-pane-editor";

interface EditSopPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit Coding SOP | Qodeer Review",
  description: "Perbarui aturan Coding SOP dan standar kepatuhan kode",
};

export default async function EditSopPage({ params }: EditSopPageProps) {
  const { id } = await params;

  const dbSop = await prisma.codingSop.findUnique({
    where: { id },
    include: {
      category: true,
      repository: true,
    },
  });

  if (!dbSop) {
    notFound();
  }

  const sop: CodingSop = {
    id: dbSop.id,
    title: dbSop.title,
    category: dbSop.category.slug as any,
    categoryId: dbSop.categoryId,
    categoryName: dbSop.category.name,
    categoryColor: dbSop.category.colorBadge,
    scope: (dbSop.scope || "GLOBAL") as any,
    repositoryId: dbSop.repositoryId || undefined,
    repositorySlug: dbSop.repository?.slug,
    projectKey: dbSop.repository?.projectKey,
    summary: dbSop.summary || undefined,
    rulesMarkdown: dbSop.rulesMarkdown,
    isEnabled: dbSop.isEnabled,
    createdBy: dbSop.createdBy,
    createdAt: dbSop.createdAt.toISOString(),
    updatedAt: dbSop.updatedAt.toISOString(),
  };

  return <SopDualPaneEditor initialSop={sop} mode="edit" />;
}
