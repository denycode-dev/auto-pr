"use client";

import { DownloadCloud, RefreshCw } from "lucide-react";

import { DashboardPageHeader } from "@/app/(main)/dashboard/_components/dashboard-page-header";
import { Button } from "@/components/ui/button";

interface PrQueueHeaderProps {
  onOpenSyncDialog?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PrQueueHeader({ onOpenSyncDialog, onRefresh, isRefreshing = false }: PrQueueHeaderProps) {
  return (
    <DashboardPageHeader
      title="Antrean Pull Request"
      description="Daftar pull request Bitbucket Server yang menunggu peninjauan otomatis dan persetujuan Senior Lead."
    >
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="h-9 gap-1.5 text-xs">
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Menyinkronkan..." : "Refresh"}
        </Button>
      )}

      {onOpenSyncDialog && (
        <Button size="sm" onClick={onOpenSyncDialog} className="h-9 gap-2 font-semibold text-xs shadow-xs">
          <DownloadCloud className="size-4" />
          Tarik PR dari Bitbucket
        </Button>
      )}
    </DashboardPageHeader>
  );
}
