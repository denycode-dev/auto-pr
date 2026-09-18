"use client";

import * as React from "react";

import { AlertCircle, Bot, CheckCircle2, XCircle } from "lucide-react";

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
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
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
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="flex items-center gap-2 font-semibold text-base">
              <Bot className="size-4 shrink-0 text-indigo-500" />
              <span className="truncate">Distribusi Rekomendasi AI</span>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-xs">
            Belum ada data rekomendasi pull request di database.
          </div>
        ) : (
          <div className="space-y-3.5">
            {stats.map((s) => (
              <div key={s.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <s.icon className={`size-3.5 shrink-0 ${s.textColor}`} />
                    <span className="truncate font-medium text-foreground">{s.label}</span>
                    <span className="hidden truncate text-muted-foreground sm:inline">({s.sublabel})</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-mono">
                    <span className="font-semibold">{s.count} PR</span>
                    <span className="text-muted-foreground">({s.percentage}%)</span>
                  </div>
                </div>
                <Progress value={s.percentage} className={`h-2 [&>div]:${s.color}`} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
