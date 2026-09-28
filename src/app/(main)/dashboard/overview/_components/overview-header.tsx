"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Bot, CheckCircle2, GitPullRequest, RefreshCw, Server } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function OverviewHeader() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Data overview berhasil disinkronisasi ulang.");
    }, 600);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
              Code Review & Decision Cockpit
            </h1>
          </div>
          <p className="max-w-3xl text-muted-foreground text-xs leading-relaxed sm:text-sm">
            Sistem Otomasi Review Berbasis AI & Asisten Keputusan Senior Engineer untuk Bitbucket Server 8.19
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 self-start xl:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5 whitespace-nowrap text-xs shadow-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Menyinkronkan..." : "Sinkronisasi Ulang"}
          </Button>
          <Button asChild size="sm" className="gap-1.5 whitespace-nowrap text-xs shadow-xs">
            <Link href="/dashboard/pull-requests">
              <GitPullRequest className="size-3.5" />
              Buka Antrean PR
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
