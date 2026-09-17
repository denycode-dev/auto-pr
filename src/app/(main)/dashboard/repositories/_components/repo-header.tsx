"use client";

import * as React from "react";

import { FolderGit2, Plus, RefreshCw, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RepoHeaderProps {
  onConnectNew: () => void;
}

export function RepoHeader({ onConnectNew }: RepoHeaderProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">Manajemen Repositori Bitbucket</h1>
          <Badge
            variant="outline"
            className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs shrink-0 whitespace-nowrap font-mono"
          >
            REST API 100%
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl">
          Daftar proyek dan repositori Bitbucket Server 8.19 yang didaftarkan untuk proses code review otomatis.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
        <Button size="sm" onClick={onConnectNew} className="gap-1.5 text-xs shadow-xs whitespace-nowrap">
          <Plus className="size-4" />
          Hubungkan Repositori
        </Button>
      </div>
    </div>
  );
}
