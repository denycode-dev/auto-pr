"use client";

import { Plus } from "lucide-react";

import { DashboardPageHeader } from "@/app/(main)/dashboard/_components/dashboard-page-header";
import { Button } from "@/components/ui/button";

interface RepoHeaderProps {
  onConnectNew: () => void;
}

export function RepoHeader({ onConnectNew }: RepoHeaderProps) {
  return (
    <DashboardPageHeader
      title="Manajemen Repositori Bitbucket"
      description="Daftar proyek dan repositori Bitbucket yang didaftarkan untuk proses code review otomatis."
    >
      <Button size="sm" onClick={onConnectNew} className="gap-1.5 whitespace-nowrap font-semibold text-xs shadow-xs">
        <Plus className="size-4" />
        Hubungkan Repositori
      </Button>
    </DashboardPageHeader>
  );
}
