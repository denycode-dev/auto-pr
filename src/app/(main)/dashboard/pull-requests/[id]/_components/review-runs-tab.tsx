"use client";

import * as React from "react";

import { GitCommit, History, Terminal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PullRequest } from "@/data/code-review/types";

interface ReviewRunsTabProps {
  pr: PullRequest;
}

export function ReviewRunsTab({ pr }: ReviewRunsTabProps) {
  const [selectedRunJson, setSelectedRunJson] = React.useState<Record<string, unknown> | null>(null);

  // Structured analysis payload
  const runPayload = {
    pullRequestId: pr.id,
    bitbucketPrId: pr.bitbucketPrId,
    commitHash: pr.latestCommitHash,
    summary: pr.summary ?? "Review completed.",
    recommendedStatus: pr.aiRecommendation,
    sopScore: pr.sopScore,
    totalIssues: pr.totalIssues,
    criticalCount: pr.criticalCount,
    issues: pr.issues?.map((i) => ({
      filePath: i.filePath,
      lineNumber: i.lineNumber,
      lineType: i.lineType,
      severity: i.severity,
      category: i.category,
      title: i.title,
      description: i.description,
      suggestedFix: i.suggestedFix,
      isPosted: i.isPosted,
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <History className="size-4 text-primary" />
            Riwayat Pemindaian (Commit Runs)
          </h3>
          <p className="text-muted-foreground text-xs">
            Riwayat hasil pemindaian dan peninjauan AI terhadap commit Pull Request.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Latest Run */}
        <Card className="overflow-hidden border shadow-xs">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <GitCommit className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground text-xs">
                      {pr.latestCommitHash.slice(0, 10)}...
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 font-mono text-[10px] text-emerald-600">
                      Terkini
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Diproses pada {new Date(pr.updatedAt).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setSelectedRunJson(runPayload)}
              >
                <Terminal className="size-3.5" />
                Inspeksi Data Hasil Analisis
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded border bg-muted/40 p-2">
                <span className="block text-[10px] text-muted-foreground">Total Isu</span>
                <span className="font-mono font-semibold text-foreground">{pr.totalIssues} temuan</span>
              </div>
              <div className="rounded border bg-muted/40 p-2">
                <span className="block text-[10px] text-muted-foreground">Critical</span>
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{pr.criticalCount} isu</span>
              </div>
              <div className="rounded border bg-muted/40 p-2">
                <span className="block text-[10px] text-muted-foreground">Skor SOP</span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{pr.sopScore}%</span>
              </div>
              <div className="rounded border bg-muted/40 p-2">
                <span className="block text-[10px] text-muted-foreground">Durasi Analisis</span>
                <span className="font-mono font-semibold text-foreground">1.42s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raw LLM JSON Dialog */}
      <Dialog open={!!selectedRunJson} onOpenChange={(open) => !open && setSelectedRunJson(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              <Terminal className="size-4 text-indigo-500" />
              Raw LLM Output (OpenAI SDK Structured Response)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Payload JSON mentah yang diterima backend dari endpoint OpenAI untuk audit & debugging transparansi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3">
            <pre className="whitespace-pre font-mono text-[11px] text-emerald-400">
              {JSON.stringify(selectedRunJson, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
