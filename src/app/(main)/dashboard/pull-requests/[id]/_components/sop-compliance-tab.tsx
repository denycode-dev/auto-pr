"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, FileCode, Shield, ShieldAlert, Sparkles, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CodingSop, PullRequest } from "@/data/code-review/types";

interface SopComplianceTabProps {
  pr: PullRequest;
}

export function SopComplianceTab({ pr }: SopComplianceTabProps) {
  const [sops, setSops] = React.useState<CodingSop[]>([]);

  React.useEffect(() => {
    fetch("/api/sops")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setSops(res.data);
        } else {
          setSops([]);
        }
      })
      .catch(() => setSops([]));
  }, []);

  const issues = pr.issues || [];

  const testedRules = sops.map((sop) => {
    const catStr = (typeof sop.category === "string" ? sop.category : sop.category?.name || sop.categoryName || "").toLowerCase();
    const matchedIssue = issues.find(
      (iss) =>
        (catStr && (iss.category || "").toLowerCase() === catStr) ||
        (catStr && (iss.title || "").toLowerCase().includes(catStr)) ||
        (iss.description || "").toLowerCase().includes(sop.title.toLowerCase())
    );

    return {
      ...sop,
      isPassed: !matchedIssue,
      reason: matchedIssue
        ? `Pelanggaran ditemukan pada ${matchedIssue.filePath}:${matchedIssue.lineNumber} (${matchedIssue.title})`
        : "Kode mematuhi standar SOP ini tanpa anomali.",
    };
  });

  const passedCount = testedRules.filter((r) => r.isPassed).length;

  return (
    <div className="space-y-5">
      {/* Overview Banner */}
      <Card className="border shadow-xs bg-muted/20">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Evaluasi Kepatuhan Standar SOP Kode
              </h3>
              {testedRules.length > 0 && (
                <Badge variant="outline" className="text-xs font-mono">
                  {passedCount} / {testedRules.length} Lolos
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Penggabungan aturan standar kode Global organisasi dan aturan khusus per Repositori.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-background border px-3 py-2 rounded-lg">
            <span className="text-xs text-muted-foreground">Skor Akhir:</span>
            <span
              className={`text-xl font-bold font-mono ${
                pr.sopScore >= 80
                  ? "text-emerald-600 dark:text-emerald-400"
                  : pr.sopScore >= 60
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {pr.sopScore}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Rules Breakdown */}
      {testedRules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center text-xs text-muted-foreground">
          Belum ada aturan Coding SOP yang terdaftar di database.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {testedRules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-lg border p-4 transition-colors ${
                rule.isPassed
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : "bg-rose-500/5 border-rose-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {rule.isPassed ? (
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">
                        {rule.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {typeof rule.category === "string" ? rule.category : rule.category?.name || rule.categoryName || "Umum"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rule.reason}
                    </p>
                    {rule.rulesMarkdown && (
                      <div className="text-[11px] font-mono bg-muted/40 p-2 rounded border mt-2 text-foreground/80">
                        {rule.rulesMarkdown}
                      </div>
                    )}
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    rule.isPassed
                      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 text-[10px]"
                      : "border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10 text-[10px]"
                  }
                >
                  {rule.isPassed ? "Passed" : "Violated"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
