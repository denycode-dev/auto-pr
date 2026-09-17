"use client";

import * as React from "react";

import { CheckCircle2, Shield, XCircle } from "lucide-react";

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
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        return text.trim() ? JSON.parse(text) : null;
      })
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setSops(res.data);
        } else {
          setSops([]);
        }
      })
      .catch(() => setSops([]));
  }, []);

  const issues = pr.issues ?? [];

  const testedRules = sops.map((sop) => {
    const catStr = (
      typeof sop.category === "string" ? sop.category : sop.category?.name || sop.categoryName || ""
    ).toLowerCase();
    const matchedIssue = issues.find(
      (iss) =>
        (catStr && (iss.category || "").toLowerCase() === catStr) ||
        (catStr && (iss.title || "").toLowerCase().includes(catStr)) ||
        (iss.description || "").toLowerCase().includes(sop.title.toLowerCase()),
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
      <Card className="border bg-muted/20 shadow-xs">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Evaluasi Kepatuhan Standar SOP Kode</h3>
              {testedRules.length > 0 && (
                <Badge variant="outline" className="font-mono text-xs">
                  {passedCount} / {testedRules.length} Lolos
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Penggabungan aturan standar kode Global organisasi dan aturan khusus per Repositori.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
            <span className="text-muted-foreground text-xs">Skor Akhir:</span>
            <span
              className={`font-bold font-mono text-xl ${
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
        <div className="rounded-xl border border-border/80 border-dashed bg-muted/20 p-8 text-center text-muted-foreground text-xs">
          Belum ada aturan Coding SOP yang terdaftar di database.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {testedRules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-lg border p-4 transition-colors ${
                rule.isPassed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {rule.isPassed ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground text-xs">{rule.title}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {typeof rule.category === "string"
                          ? rule.category
                          : rule.category?.name || rule.categoryName || "Umum"}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-muted-foreground text-xs">{rule.summary || rule.reason}</p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    rule.isPassed
                      ? "border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                      : "border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-400"
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
