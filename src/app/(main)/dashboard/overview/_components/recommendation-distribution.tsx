"use client";

import * as React from "react";

import { cn } from "cn";
import { AlertCircle, Bot, CheckCircle2, XCircle } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  approve: {
    label: "Approve",
    color: "var(--color-emerald-500)",
    icon: CheckCircle2,
  },
  needsWork: {
    label: "Needs Work",
    color: "var(--color-amber-500)",
    icon: AlertCircle,
  },
  decline: {
    label: "Decline",
    color: "var(--color-rose-500)",
    icon: XCircle,
  },
} satisfies ChartConfig;

export function RecommendationDistribution() {
  const [distData, setDistData] = React.useState<{
    approve: number;
    needsWork: number;
    decline: number;
  }>({ approve: 0, needsWork: 0, decline: 0 });
  const [agreementRate, setAgreementRate] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(true);

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
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const total = distData.approve + distData.needsWork + distData.decline;
  const getPercentage = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  const stats = [
    {
      key: "approve",
      label: "Approve",
      fullLabel: "Rekomendasi Approve",
      sublabel: "PR bersih & patuh SOP",
      count: distData.approve,
      percentage: getPercentage(distData.approve),
      fill: "var(--color-emerald-500)",
      textColor: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    {
      key: "needsWork",
      label: "Needs Work",
      fullLabel: "Rekomendasi Needs Work",
      sublabel: "Ada temuan bug / SOP",
      count: distData.needsWork,
      percentage: getPercentage(distData.needsWork),
      fill: "var(--color-amber-500)",
      textColor: "text-amber-600 dark:text-amber-400",
      icon: AlertCircle,
    },
    {
      key: "decline",
      label: "Decline",
      fullLabel: "Rekomendasi Decline",
      sublabel: "Celah fatal / arsitektur",
      count: distData.decline,
      percentage: getPercentage(distData.decline),
      fill: "var(--color-rose-500)",
      textColor: "text-rose-600 dark:text-rose-400",
      icon: XCircle,
    },
  ];

  const chartData = React.useMemo(
    () => [
      {
        status: "approve",
        label: "Approve",
        count: distData.approve,
        fill: "var(--color-emerald-500)",
      },
      {
        status: "needsWork",
        label: "Needs Work",
        count: distData.needsWork,
        fill: "var(--color-amber-500)",
      },
      {
        status: "decline",
        label: "Decline",
        count: distData.decline,
        fill: "var(--color-rose-500)",
      },
    ],
    [distData.approve, distData.needsWork, distData.decline],
  );

  const activeChartData = React.useMemo(() => chartData.filter((item) => item.count > 0), [chartData]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-[280px] flex-col items-center justify-center gap-4 py-4">
          <div className="size-32 animate-pulse rounded-full border-8 border-muted/40" />
          <div className="w-full space-y-2 pt-2">
            <div className="h-7 w-full animate-pulse rounded-md bg-muted/40" />
            <div className="h-7 w-full animate-pulse rounded-md bg-muted/40" />
            <div className="h-7 w-full animate-pulse rounded-md bg-muted/40" />
          </div>
        </div>
      );
    }

    if (total === 0) {
      return (
        <div className="flex h-[280px] flex-col items-center justify-center text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <p className="font-medium text-foreground text-sm">Belum Ada Data Rekomendasi</p>
          <p className="mt-1 max-w-[260px] text-muted-foreground text-xs">
            Belum ada data rekomendasi pull request di database.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[190px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="status"
                  formatter={(value, name, item) => {
                    const configItem = chartConfig[item.payload?.status as keyof typeof chartConfig];
                    const count = Number(value);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div className="flex w-full items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-[2px]"
                            style={{ backgroundColor: item.payload?.fill }}
                            aria-hidden="true"
                          />
                          <span className="text-muted-foreground">{configItem?.label ?? name}</span>
                        </div>
                        <div className="flex items-center gap-1 font-medium font-mono text-foreground tabular-nums">
                          <span>{count} PR</span>
                          <span className="text-muted-foreground">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={activeChartData}
              dataKey="count"
              nameKey="status"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={activeChartData.length > 1 ? 3 : 0}
              cornerRadius={4}
              stroke="var(--color-card)"
              strokeWidth={2}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground font-bold font-mono text-2xl tracking-tight"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 18}
                          className="fill-muted-foreground font-medium text-[11px]"
                        >
                          Total PR
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="grid grid-cols-1 divide-y divide-border/60 border-border/60 border-t pt-1">
          {stats.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-md px-1.5 py-2 text-xs transition-colors first:pt-1.5 last:pb-1 hover:bg-muted/30"
            >
              <div className="flex min-w-0 items-center gap-2">
                <s.icon className={cn("size-3.5 shrink-0", s.textColor)} aria-hidden="true" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">{s.fullLabel}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{s.sublabel}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 font-mono tabular-nums">
                <span className="font-semibold text-foreground">{s.count} PR</span>
                <span className="text-[11px] text-muted-foreground">({s.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="flex items-center gap-2 font-semibold text-base">
              <Bot className="size-4 shrink-0 text-indigo-500" aria-hidden="true" />
              <span className="truncate">Distribusi Rekomendasi AI</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Proporsi hasil keputusan AI terhadap pull request aktif
            </CardDescription>
          </div>
          {total > 0 && agreementRate > 0 && (
            <Badge
              variant="outline"
              className="h-6 gap-1 self-start px-2 font-mono font-normal text-[11px] sm:self-auto"
            >
              <span className="text-muted-foreground">Keselarasan:</span>
              <span className="font-semibold text-foreground">{agreementRate}%</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{renderContent()}</CardContent>
    </Card>
  );
}
