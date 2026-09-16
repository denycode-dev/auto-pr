"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, XCircle, Bot } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function RecommendationDistribution() {
  const [distData, setDistData] = React.useState<{
    approve: number;
    needsWork: number;
    decline: number;
  }>({ approve: 0, needsWork: 0, decline: 0 });
  const [agreementRate, setAgreementRate] = React.useState<number>(0);

  React.useEffect(() => {
    fetch("/api/overview")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.recommendationDistribution) {
          const list = res.data.recommendationDistribution as Array<{ name: string; value: number }>;
          const approve = list.find((i) => i.name === "Approve")?.value ?? 0;
          const needsWork = list.find((i) => i.name === "Needs Work")?.value ?? 0;
          const decline = list.find((i) => i.name === "Decline")?.value ?? 0;
          setDistData({ approve, needsWork, decline });
          setAgreementRate(res.data.metrics?.agreementRate ?? 0);
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil distribusi rekomendasi:", err);
      });
  }, []);

  const total = distData.approve + distData.needsWork + distData.decline;
  const getPercentage = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  const stats = [
    {
      label: "Rekomendasi Approve",
      sublabel: "PR bersih & patuh SOP",
      count: distData.approve,
      percentage: getPercentage(distData.approve),
      color: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    {
      label: "Rekomendasi Needs Work",
      sublabel: "Ada bug logika / pelanggaran SOP",
      count: distData.needsWork,
      percentage: getPercentage(distData.needsWork),
      color: "bg-amber-500",
      textColor: "text-amber-600 dark:text-amber-400",
      icon: AlertCircle,
    },
    {
      label: "Rekomendasi Decline",
      sublabel: "Celah fatal / arsitektur salah",
      count: distData.decline,
      percentage: getPercentage(distData.decline),
      color: "bg-rose-500",
      textColor: "text-rose-600 dark:text-rose-400",
      icon: XCircle,
    },
  ];

  return (
    <Card className="shadow-xs border border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="size-4 text-indigo-500 shrink-0" />
              <span className="truncate">Distribusi Rekomendasi AI</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Rasio saran status yang dihasilkan OpenAI SDK (Qodeer Gateway)
            </CardDescription>
          </div>
          <span className="inline-flex items-center self-start sm:self-center shrink-0 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
            {total > 0 ? `${agreementRate}% Keselarasan Senior` : "Belum Ada Data PR"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Belum ada data rekomendasi pull request di database.
          </div>
        ) : (
          <div className="space-y-3.5">
            {stats.map((s) => (
              <div key={s.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <s.icon className={`size-3.5 shrink-0 ${s.textColor}`} />
                    <span className="font-medium text-foreground truncate">{s.label}</span>
                    <span className="text-muted-foreground hidden sm:inline truncate">({s.sublabel})</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="font-semibold">{s.count} PR</span>
                    <span className="text-muted-foreground">({s.percentage}%)</span>
                  </div>
                </div>
                <Progress value={s.percentage} className={`h-2 [&>div]:${s.color}`} />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground font-medium">Prinsip Human-in-the-Loop (BR-07):</strong> AI hanya bertugas memberikan rekomendasi. Keputusan final 100% berada di tangan Senior Engineer melalui panel review antrean.
        </div>
      </CardContent>
    </Card>
  );
}
