"use client";

import * as React from "react";

import Link from "next/link";

import { FolderKanban, Plus, Sparkles, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SopsHeaderProps {
  onManageCategories: () => void;
  onImportMd: () => void;
}

export function SopsHeader({ onManageCategories, onImportMd }: SopsHeaderProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">Manajemen Coding SOP</h1>
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            Dual-Scope SOP Architecture
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl">
          Kelola aturan standar kode global organisasi dan panduan khusus per repositori yang diintegrasikan ke
          peninjauan otomatis.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap self-start lg:self-center">
        <Button variant="outline" size="sm" onClick={onManageCategories} className="gap-1.5 text-xs h-8">
          <FolderKanban className="size-3.5 text-muted-foreground" />
          Kelola Kategori
        </Button>

        <Button variant="outline" size="sm" onClick={onImportMd} className="gap-1.5 text-xs h-8">
          <UploadCloud className="size-3.5 text-primary" />
          Import (.md)
        </Button>

        <Button size="sm" asChild className="gap-1.5 text-xs h-8 shadow-xs font-semibold">
          <Link href="/dashboard/sops/create">
            <Plus className="size-4" />
            Tulis SOP Baru
          </Link>
        </Button>
      </div>
    </div>
  );
}
