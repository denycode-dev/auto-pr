"use client";

import * as React from "react";

import { AlertTriangle, Clock, GitPullRequest, ShieldCheck, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function MetricCards() {
  const [metricsData, setMetricsData] = React.useState<{
    activePrCount: number;
    totalPrCount: number;
    analyzedPrCount: number;
    approvalRate: number;
    criticalIssueCount: number;
    avgSopScore: number;
    agreementRate: number;
    coverageRate: number;
  } | null>(null);

  React.useEffect(() => {
    fetch("/api/overview")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((res) => {
        if (res.success && res.data?.metrics) {
          setMetricsData(res.data.metrics);
        }
      })
      .catch((err) => console.error("Gagal mengambil metrik overview:", err));
  }, []);

  const pendingSenior = metricsData?.activePrCount ?? 0;
  const criticalCount = metricsData?.criticalIssueCount ?? 0;
  const analyzedPrCount = metricsData?.analyzedPrCount ?? 0;
  const _totalPrCount = metricsData?.totalPrCount ?? 0;
  const avgSopScore = metricsData?.avgSopScore ?? 0;
  const approvalRate = metricsData?.approvalRate ?? 0;

  const metrics = [
    {
      title: "Menunggu Review",
      fullTitle: "Menunggu Keputusan",
      value: `${pendingSenior} PR`,
      icon: Clock,
      iconBg:
        pendingSenior > 0
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      accentBorder: pendingSenior > 0 ? "border-l-3 border-l-amber-500" : "border-l-3 border-l-emerald-500",
    },
    {
      title: "Temuan Kritis",
      fullTitle: "Temuan Kritis & Keamanan",
      value: `${criticalCount} Isu`,
      icon: AlertTriangle,
      iconBg:
        criticalCount > 0
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      accentBorder: criticalCount > 0 ? "border-l-3 border-l-rose-500" : "border-l-3 border-l-emerald-500",
    },
    {
      title: "PR Dianalisis",
      fullTitle: "Total PR Dianalisis AI",
      value: `${analyzedPrCount} PR`,
      icon: GitPullRequest,
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      accentBorder: "border-l-3 border-l-indigo-500",
    },
    {
      title: "Kepatuhan SOP",
      fullTitle: "Kepatuhan SOP Rata-Rata",
      value: avgSopScore > 0 ? `${avgSopScore}%` : "0%",
      icon: ShieldCheck,
      iconBg:
        avgSopScore >= 80
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      accentBorder: avgSopScore >= 80 ? "border-l-3 border-l-emerald-500" : "border-l-3 border-l-muted",
    },
    {
      title: "Tingkat Approval",
      fullTitle: "Rasio Approval Senior Lead",
      value: `${approvalRate}%`,
      icon: Zap,
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      accentBorder: "border-l-3 border-l-sky-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:gap-3.5">
      {metrics.map((item) => (
        <Card
          key={item.title}
          className={`overflow-hidden border border-border/80 shadow-xs transition-all hover:shadow-md ${item.accentBorder}`}
        >
          <CardContent className="flex h-full min-w-0 flex-col justify-between gap-1.5 px-2 py-1">
            {/* Header: Title + Icon */}
            <div className="flex items-center justify-between gap-1">
              <span
                className="truncate font-semibold text-[11px] text-muted-foreground uppercase tracking-wider"
                title={item.fullTitle}
              >
                {item.title}
              </span>
              <div className={`shrink-0 rounded-md p-1 ${item.iconBg}`}>
                <item.icon className="size-3.5" />
              </div>
            </div>

            {/* Metric Value */}
            <div className="pt-0.5 font-mono font-semibold text-foreground text-2xl tracking-tight">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
