"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareCode,
  ShieldAlert,
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
      <Card className="border border-border/80 bg-muted/20 shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  Analisis AI Belum Dijalankan
                </span>
                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                  Menunggu Permintaan
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Pull Request ini belum dianalisis oleh sistem. Klik tombol{" "}
                <strong className="text-foreground font-semibold">Mulai Analisis AI</strong> di atas
                untuk memindai diff kode terhadap standar Coding SOP dan mendeteksi anomali keamanan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 sm:border-l sm:pl-4">
            <Clock className="size-4" />
            <span>On-Demand Review</span>
          </div>
        </div>
      </Card>
    );
  }

  if (isInProgress) {
    return (
      <Card className="border border-primary/30 bg-primary/5 shadow-xs overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-2 text-primary shrink-0">
              <Loader2 className="size-5 animate-spin" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-semibold text-sm text-foreground">
                Pemindaian AI Sedang Berlangsung...
              </h4>
              <p className="text-xs text-muted-foreground">
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
            ? "bg-emerald-500/10 border-b border-emerald-500/20"
            : isNeedsWork
              ? "bg-amber-500/10 border-b border-amber-500/20"
              : isDecline
                ? "bg-rose-500/10 border-b border-rose-500/20"
                : "bg-muted/40 border-b"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-background p-2 shadow-xs shrink-0 mt-0.5">
              <Bot className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rekomendasi Peninjauan AI:
                </span>
                {isApprove && (
                  <Badge className="bg-emerald-600 text-white font-semibold text-xs gap-1">
                    <CheckCircle2 className="size-3" /> Disarankan SETUJUI (APPROVE)
                  </Badge>
                )}
                {isNeedsWork && (
                  <Badge className="bg-amber-600 text-white font-semibold text-xs gap-1">
                    <AlertTriangle className="size-3" /> Disarankan PERLU REVISI (NEEDS WORK)
                  </Badge>
                )}
                {isDecline && (
                  <Badge variant="destructive" className="font-semibold text-xs gap-1">
                    <XCircle className="size-3" /> Disarankan TOLAK (DECLINE)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Analisis otomatis berdasarkan panduan Coding SOP &amp; Standar Keamanan Tim
              </p>
            </div>
          </div>

          {/* SOP Compliance Gauge */}
          <div className="flex items-center gap-4 bg-background/80 rounded-lg p-2.5 border border-border/80 min-w-[220px]">
            <ShieldCheck className="size-5 text-primary shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Skor Kepatuhan SOP</span>
                <span className="font-mono font-bold text-foreground">{pr.sopScore}%</span>
              </div>
              <Progress
                value={pr.sopScore}
                className="h-1.5"
              />
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Narrative Summary */}
        <div className="rounded-md bg-muted/40 border border-border/60 p-3 text-xs leading-relaxed text-foreground">
          <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            Ringkasan Analisis Perubahan Kode:
          </p>
          <div className="text-muted-foreground whitespace-pre-line pl-3 border-l-2 border-primary/40 font-sans">
            {pr.summary || "Tidak ada ringkasan analisis tersedia."}
          </div>
        </div>

        {/* Sync Status info */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground border-t border-border/60">
          <div className="flex items-center gap-1.5">
            <MessageSquareCode className="size-3.5 text-primary" />
            <span>
              Sinkronisasi Bitbucket:{" "}
              <strong className="text-foreground">
                {pr.issues?.filter((i) => i.isPosted).length || 0} Komentar Peninjauan
              </strong>{" "}
              berhasil disematkan pada baris kode terkait.
            </span>
          </div>

          <span className="text-[11px] font-mono text-muted-foreground/80">
            Analisis Selesai: {pr.updatedAt ? new Date(pr.updatedAt).toLocaleString("id-ID") : "-"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
