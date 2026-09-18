"use client";

import Link from "next/link";

import { FolderKanban, GitFork, Plus, UploadCloud } from "lucide-react";

import { DashboardPageHeader } from "@/app/(main)/dashboard/_components/dashboard-page-header";
import { Button } from "@/components/ui/button";

interface SopsHeaderProps {
  onManageCategories: () => void;
  onImportMd: () => void;
  onOpenLocalGuide?: () => void;
}

export function SopsHeader({ onManageCategories, onImportMd, onOpenLocalGuide }: SopsHeaderProps) {
  return (
    <DashboardPageHeader title="Manajemen Coding SOP" description="Kelola aturan standar kode global organisasi.">
      {onOpenLocalGuide && (
        <Button variant="outline" size="sm" onClick={onOpenLocalGuide} className="h-9 gap-1.5 text-xs">
          <GitFork className="size-3.5 text-primary" />
          Panduan SOP Lokal
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onManageCategories} className="h-9 gap-1.5 text-xs">
        <FolderKanban className="size-3.5 text-muted-foreground" />
        Kelola Kategori
      </Button>

      <Button variant="outline" size="sm" onClick={onImportMd} className="h-9 gap-1.5 text-xs">
        <UploadCloud className="size-3.5 text-primary" />
        Import (.md)
      </Button>

      <Button size="sm" asChild className="h-9 gap-1.5 font-semibold text-xs shadow-xs">
        <Link href="/dashboard/sops/create">
          <Plus className="size-4" />
          Tulis SOP Baru
        </Link>
      </Button>
    </DashboardPageHeader>
  );
}
