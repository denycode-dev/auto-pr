"use client";

import * as React from "react";
import { Shield, AlertTriangle, AlertCircle, Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SeverityBreakdown() {
  const [breakdown, setBreakdown] = React.useState<{
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>({ critical: 0, high: 0, medium: 0, low: 0 });

  React.useEffect(() => {
    fetch("/api/overview")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.severityBreakdown) {
          const list = res.data.severityBreakdown as Array<{ severity: string; count: number }>;
          const critical = list.find((i) => i.severity === "CRITICAL")?.count ?? 0;
          const high = list.find((i) => i.severity === "HIGH")?.count ?? 0;
          const medium = list.find((i) => i.severity === "MEDIUM")?.count ?? 0;
          const low = list.find((i) => i.severity === "LOW")?.count ?? 0;
          setBreakdown({ critical, high, medium, low });
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil rincian severity:", err);
      });
  }, []);

  const total = breakdown.critical + breakdown.high + breakdown.medium + breakdown.low;

  const severityItems = [
    {
      name: "Critical Issues",
      description: "Celah keamanan fatal (SQLi, Auth Bypass, RCE)",
      count: breakdown.critical,
      icon: Shield,
      color: "text-rose-500",
      badgeVariant: "destructive" as const,
    },
    {
      name: "High Severity",
      description: "Bug logika, unhandled error, memory leak risiko tinggi",
      count: breakdown.high,
      icon: AlertTriangle,
      color: "text-amber-500",
      customBadge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    },
    {
      name: "Medium Severity",
      description: "Pelanggaran arsitektur SOP, query N+1, styling lint",
      count: breakdown.medium,
      icon: AlertCircle,
      color: "text-indigo-500",
      customBadge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    },
    {
      name: "Low / Best Practices",
      description: "Dokumentasi kode, saran refactoring minor, konsistensi",
      count: breakdown.low,
      icon: Info,
      color: "text-blue-500",
      customBadge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    },
  ];

  return (
    <Card className="shadow-xs border border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <CardTitle className="text-base font-semibold">Temuan Berdasarkan Tingkat Keparahan</CardTitle>
            <CardDescription className="text-xs">
              Klasifikasi otomatis issue kode sesuai Aturan Bisnis BR-06
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono shrink-0 whitespace-nowrap self-start sm:self-center">
            {total} Total Isu
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Belum ada temuan isu kode pada database.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {severityItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-xs gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <item.icon className={`size-4 shrink-0 ${item.color}`} />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground truncate">{item.name}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{item.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono shrink-0">
                  {item.count > 0 ? (
                    item.badgeVariant ? (
                      <Badge variant={item.badgeVariant} className="h-5 px-1.5 text-[10px] font-semibold whitespace-nowrap">
                        {item.count} Isu
                      </Badge>
                    ) : (
                      <Badge className={`h-5 px-1.5 text-[10px] font-semibold border ${item.customBadge}`}>
                        {item.count} Isu
                      </Badge>
                    )
                  ) : (
                    <span className="text-muted-foreground text-xs font-mono">0 isu</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
