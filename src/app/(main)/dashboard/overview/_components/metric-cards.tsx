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
  const totalPrCount = metricsData?.totalPrCount ?? 0;
  const avgSopScore = metricsData?.avgSopScore ?? 0;
  const approvalRate = metricsData?.approvalRate ?? 0;

  const metrics = [
    {
      title: "Menunggu Review",
      fullTitle: "Menunggu Keputusan",
      value: `${pendingSenior} PR`,
      subtitle: pendingSenior > 0 ? "Perlu tindakan senior" : "Tidak ada antrean",
      fullSubtitle: "Memerlukan tindakan Approve / Needs Work",
      icon: Clock,
      badge: pendingSenior > 0 ? "Perlu Tindakan" : "Bersih",
      badgeColor:
        pendingSenior > 0
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
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
      subtitle: criticalCount > 0 ? "Kerentanan & bug keamanan" : "Tidak ada kerentanan",
      fullSubtitle: "SQL Injection, Hardcoded Secret, CVE",
      icon: AlertTriangle,
      badge: criticalCount > 0 ? "Prioritas" : "Aman",
      badgeColor:
        criticalCount > 0
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
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
      subtitle: totalPrCount > 0 ? `${analyzedPrCount} dari ${totalPrCount} PR terproses` : "Belum ada PR di database",
      fullSubtitle: "Cakupan otomatis analisis AI",
      icon: GitPullRequest,
      badge: totalPrCount > 0 ? `${Math.round((analyzedPrCount / totalPrCount) * 100)}% AI` : "0% AI",
      badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      accentBorder: "border-l-3 border-l-indigo-500",
    },
    {
      title: "Kepatuhan SOP",
      fullTitle: "Kepatuhan SOP Rata-Rata",
      value: avgSopScore > 0 ? `${avgSopScore}%` : "0%",
      subtitle: avgSopScore > 0 ? "Evaluasi Hybrid SOP" : "Belum ada data evaluasi",
      fullSubtitle: "Evaluasi Hybrid SOP (Global + Repo)",
      icon: ShieldCheck,
      badge: avgSopScore >= 80 ? "Memenuhi" : "Perlu Aturan",
      badgeColor:
        avgSopScore >= 80
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
          : "bg-muted text-muted-foreground border-border",
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
      subtitle: totalPrCount > 0 ? "Berdasarkan review senior" : "Belum ada keputusan PR",
      fullSubtitle: "Persentase PR yang disetujui senior",
      icon: Zap,
      badge: approvalRate > 0 ? "Aktif" : "N/A",
      badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      accentBorder: "border-l-3 border-l-sky-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 xl:gap-3.5">
      {metrics.map((item) => (
        <Card
          key={item.title}
          className={`overflow-hidden shadow-xs transition-all hover:shadow-md border border-border/80 ${item.accentBorder}`}
        >
          <CardContent className="p-3 sm:p-3.5 xl:p-4 flex flex-col justify-between h-full gap-2 min-w-0">
            {/* Header: Title + Icon */}
            <div className="flex items-center justify-between gap-1">
              <span
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate"
                title={item.fullTitle}
              >
                {item.title}
              </span>
              <div className={`rounded-md p-1 shrink-0 ${item.iconBg}`}>
                <item.icon className="size-3.5" />
              </div>
            </div>

            {/* Metric Value + Compact Badge */}
            <div className="flex items-baseline justify-between gap-1.5 flex-nowrap pt-0.5">
              <div className="text-2xl xl:text-3xl font-bold font-mono tracking-tight text-foreground">
                {item.value}
              </div>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 ${item.badgeColor}`}
              >
                {item.badge}
              </span>
            </div>

            {/* Subtitle */}
            <p className="text-[11px] text-muted-foreground truncate leading-tight pt-0.5" title={item.fullSubtitle}>
              {item.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
