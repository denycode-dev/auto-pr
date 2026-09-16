import { DownloadCloud, GitPullRequest, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PrQueueHeaderProps {
  onOpenSyncDialog?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PrQueueHeader({
  onOpenSyncDialog,
  onRefresh,
  isRefreshing = false,
}: PrQueueHeaderProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">Antrean Pull Request</h1>
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            Bitbucket Server 8.19
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl">
          Kelola antrean review kode dan eksekusi keputusan Senior Engineer (Approve, Needs Work, Decline).
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-1.5 text-xs whitespace-nowrap shadow-xs h-9"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Antrean
        </Button>

        <Button
          size="sm"
          onClick={onOpenSyncDialog}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs font-semibold shadow-xs h-9"
        >
          <DownloadCloud className="size-4" />
          Tarik PR dari Bitbucket
        </Button>
      </div>
    </div>
  );
}
