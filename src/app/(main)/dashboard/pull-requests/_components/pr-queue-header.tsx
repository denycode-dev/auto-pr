import { DownloadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PrQueueHeaderProps {
  onOpenSyncDialog?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PrQueueHeader({ onOpenSyncDialog, onRefresh, isRefreshing = false }: PrQueueHeaderProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">Antrean Pull Request</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 self-start lg:self-center">
        <Button
          size="sm"
          onClick={onOpenSyncDialog}
          className="h-9 gap-2 bg-indigo-600 font-semibold text-white text-xs shadow-xs hover:bg-indigo-700"
        >
          <DownloadCloud className="size-4" />
          Tarik PR dari Bitbucket
        </Button>
      </div>
    </div>
  );
}
