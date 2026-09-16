"use client";

import * as React from "react";
import { CheckCircle2, ChevronRight, Code2, Eye, GitCommit, History, Terminal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    summary: pr.summary || "Review completed.",
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
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="size-4 text-primary" />
            Riwayat Pemindaian (Commit Runs)
          </h3>
          <p className="text-xs text-muted-foreground">
            Riwayat hasil pemindaian dan peninjauan AI terhadap commit Pull Request.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Latest Run */}
        <Card className="shadow-xs border overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <GitCommit className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {pr.latestCommitHash.slice(0, 10)}...
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded bg-muted/40 p-2 border">
                <span className="text-muted-foreground block text-[10px]">Total Isu</span>
                <span className="font-semibold text-foreground font-mono">{pr.totalIssues} temuan</span>
              </div>
              <div className="rounded bg-muted/40 p-2 border">
                <span className="text-muted-foreground block text-[10px]">Critical</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                  {pr.criticalCount} isu
                </span>
              </div>
              <div className="rounded bg-muted/40 p-2 border">
                <span className="text-muted-foreground block text-[10px]">Skor SOP</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                  {pr.sopScore}%
                </span>
              </div>
              <div className="rounded bg-muted/40 p-2 border">
                <span className="text-muted-foreground block text-[10px]">Durasi Analisis</span>
                <span className="font-semibold text-foreground font-mono">1.42s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raw LLM JSON Dialog */}
      <Dialog open={!!selectedRunJson} onOpenChange={(open) => !open && setSelectedRunJson(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              <Terminal className="size-4 text-indigo-500" />
              Raw LLM Output (OpenAI SDK Structured Response)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Payload JSON mentah yang diterima backend dari endpoint OpenAI Gateway Qodeer untuk audit & debugging transparansi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded bg-zinc-950 p-3 border border-zinc-800">
            <pre className="font-mono text-[11px] text-emerald-400 whitespace-pre">
              {JSON.stringify(selectedRunJson, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
