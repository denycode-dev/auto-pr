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
            <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl text-foreground">
              Code Review & Decision Cockpit
            </h1>
            <Badge
              variant="outline"
              className="h-6 gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-2.5 text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Live Active
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-3xl">
            Sistem Otomasi Review Berbasis AI & Asisten Keputusan Senior Engineer untuk Bitbucket Server 8.19
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start xl:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5 whitespace-nowrap shadow-xs text-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Menyinkronkan..." : "Sinkronisasi Ulang"}
          </Button>
          <Button asChild size="sm" className="gap-1.5 shadow-xs whitespace-nowrap text-xs">
            <Link href="/dashboard/pull-requests">
              <GitPullRequest className="size-3.5" />
              Buka Antrean PR
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Server className="size-3.5 text-primary" />
          <span>
            Bitbucket Server: <strong className="font-medium text-foreground">v8.19.0 (Data Center)</strong>
          </span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Bot className="size-3.5 text-primary" />
          <span>
            Analisis AI: <strong className="font-medium text-foreground">Coding SOP & Keamanan</strong>
          </span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          <span>
            Sinkronisasi: <strong className="font-medium text-foreground">Bitbucket REST API 8.19</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
