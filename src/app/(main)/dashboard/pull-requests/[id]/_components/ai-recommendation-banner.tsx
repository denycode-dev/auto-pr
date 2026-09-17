"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareCode,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PullRequest } from "@/data/code-review/types";

interface AiRecommendationBannerProps {
  pr: PullRequest;
}

export function AiRecommendationBanner({ pr }: AiRecommendationBannerProps) {
  const isNotStarted = pr.aiReviewStatus === "NOT_STARTED";
  const isInProgress = pr.aiReviewStatus === "IN_PROGRESS";
  const isNeedsWork = pr.aiRecommendation === "RECOMMENDED_NEEDS_WORK";
  const isApprove = pr.aiRecommendation === "RECOMMENDED_APPROVE";
  const isDecline = pr.aiRecommendation === "RECOMMENDED_DECLINE";

  if (isNotStarted) {
    return (
      <Card className="overflow-hidden border border-border/80 bg-muted/20 shadow-xs">
        <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">Analisis AI Belum Dijalankan</span>
                <Badge variant="outline" className="font-medium text-[10px] text-muted-foreground">
                  Menunggu Permintaan
                </Badge>
              </div>
              <p className="max-w-2xl text-muted-foreground text-xs leading-relaxed">
                Pull Request ini belum dianalisis oleh sistem. Klik tombol{" "}
                <strong className="font-semibold text-foreground">Mulai Analisis AI</strong> di atas untuk memindai diff
                kode terhadap standar Coding SOP dan mendeteksi anomali keamanan.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground text-xs sm:border-l sm:pl-4">
            <Clock className="size-4" />
            <span>On-Demand Review</span>
          </div>
        </div>
      </Card>
    );
  }

  if (isInProgress) {
    return (
      <Card className="overflow-hidden border border-primary/30 bg-primary/5 shadow-xs">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-lg bg-primary/20 p-2 text-primary">
              <Loader2 className="size-5 animate-spin" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-semibold text-foreground text-sm">Pemindaian AI Sedang Berlangsung...</h4>
              <p className="text-muted-foreground text-xs">
                Sistem sedang memindai perubahan berkas dan mencocokkan dengan aturan Coding SOP tim.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border shadow-xs">
      <div
        className={`p-4 ${
          isApprove
            ? "border-emerald-500/20 border-b bg-emerald-500/10"
            : isNeedsWork
              ? "border-amber-500/20 border-b bg-amber-500/10"
              : isDecline
                ? "border-rose-500/20 border-b bg-rose-500/10"
                : "border-b bg-muted/40"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-lg bg-background p-2 shadow-xs">
              <Bot className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  Rekomendasi Peninjauan AI:
                </span>
                {isApprove && (
                  <Badge className="gap-1 bg-emerald-600 font-semibold text-white text-xs">
                    <CheckCircle2 className="size-3" /> Disarankan SETUJUI (APPROVE)
                  </Badge>
                )}
                {isNeedsWork && (
                  <Badge className="gap-1 bg-amber-600 font-semibold text-white text-xs">
                    <AlertTriangle className="size-3" /> Disarankan PERLU REVISI (NEEDS WORK)
                  </Badge>
                )}
                {isDecline && (
                  <Badge variant="destructive" className="gap-1 font-semibold text-xs">
                    <XCircle className="size-3" /> Disarankan TOLAK (DECLINE)
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Analisis otomatis berdasarkan panduan Coding SOP &amp; Standar Keamanan Tim
              </p>
            </div>
          </div>

          {/* SOP Compliance Gauge */}
          <div className="flex min-w-[220px] items-center gap-4 rounded-lg border border-border/80 bg-background/80 p-2.5">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Skor Kepatuhan SOP</span>
                <span className="font-bold font-mono text-foreground">{pr.sopScore}%</span>
              </div>
              <Progress value={pr.sopScore} className="h-1.5" />
            </div>
          </div>
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        {/* Narrative Summary */}
        <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-foreground text-xs leading-relaxed">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Ringkasan Analisis Perubahan Kode:
          </p>
          <div className="whitespace-pre-line border-primary/40 border-l-2 pl-3 font-sans text-muted-foreground">
            {pr.summary ?? "Tidak ada ringkasan analisis tersedia."}
          </div>
        </div>

        {/* Sync Status info */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-t pt-1 text-muted-foreground text-xs">
          <div className="flex items-center gap-1.5">
            <MessageSquareCode className="size-3.5 text-primary" />
            <span>
              Sinkronisasi Bitbucket:{" "}
              <strong className="text-foreground">
                {pr.issues?.filter((i) => i.isPosted).length ?? 0} Komentar Peninjauan
              </strong>{" "}
              berhasil disematkan pada baris kode terkait.
            </span>
          </div>

          <span className="font-mono text-[11px] text-muted-foreground/80">
            Analisis Selesai: {pr.updatedAt ? new Date(pr.updatedAt).toLocaleString("id-ID") : "-"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
