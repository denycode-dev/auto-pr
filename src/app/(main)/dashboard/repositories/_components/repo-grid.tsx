"use client";

import * as React from "react";

import { CheckCircle2, GitBranch, GitPullRequest, Globe, Server, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { Repository } from "@/data/code-review/types";

interface RepoGridProps {
  repositories: Repository[];
  onToggleActive: (id: string, active: boolean) => void;
}

export function RepoGrid({ repositories, onToggleActive }: RepoGridProps) {
  if (repositories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-12 text-center">
        <Server className="size-8 mx-auto text-muted-foreground/60 mb-3" />
        <h4 className="font-semibold text-sm text-foreground mb-1">Belum Ada Repositori Terhubung</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Database repositori kosong. Gunakan tombol "Hubungkan Repositori" untuk mendaftarkan repositori Bitbucket
          Server baru.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {repositories.map((repo) => (
        <Card key={repo.id} className="shadow-xs overflow-hidden border">
          <CardHeader className="p-4 pb-2 bg-muted/20 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold bg-muted">
                {repo.projectKey}
              </Badge>
              <h3 className="font-semibold text-sm text-foreground font-mono">{repo.slug}</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{repo.isActive ? "Aktif" : "Nonaktif"}</span>
              <Switch
                checked={repo.isActive}
                onCheckedChange={(checked) => {
                  onToggleActive(repo.id, checked);
                  toast.info(`Status repositori ${repo.slug} diperbarui: ${checked ? "Aktif" : "Nonaktif"}`);
                }}
              />
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3 text-xs">
            <p className="text-muted-foreground font-medium text-xs line-clamp-1">{repo.name}</p>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded bg-muted/40 p-2 border space-y-0.5">
                <span className="text-muted-foreground block text-[10px]">Default Branch</span>
                <div className="flex items-center gap-1 font-mono font-medium text-foreground">
                  <GitBranch className="size-3 text-primary" />
                  {repo.defaultBranch}
                </div>
              </div>

              <div className="rounded bg-muted/40 p-2 border space-y-0.5">
                <span className="text-muted-foreground block text-[10px]">PR Terbuka</span>
                <div className="flex items-center gap-1 font-mono font-medium text-foreground">
                  <GitPullRequest className="size-3 text-primary" />
                  {repo.openPrCount} Pull Request
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  Protokol:
                </span>
                <Badge
                  variant="outline"
                  className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-mono"
                >
                  REST API 1.0 (Direct)
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-mono">
                <span>Sinkronisasi Terakhir:</span>
                <span>{repo.lastSyncAt ? new Date(repo.lastSyncAt).toLocaleTimeString("id-ID") + " WIB" : "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
