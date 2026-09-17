"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Clock,
  Cpu,
  DownloadCloud,
  FileCheck2,
  Loader2,
  MessageSquareCode,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface ReviewProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prId: string;
  bitbucketPrId: number;
  onCompleted?: () => void;
}

interface StepItem {
  id: number;
  title: string;
  description: string;
  targetProgress: number;
  icon: React.ElementType;
}

const STAGES: StepItem[] = [
  {
    id: 1,
    title: "Mengambil Diff & Komit",
    description: "Mengambil diff perubahan dan riwayat commit dari Bitbucket Server 8.19...",
    targetProgress: 20,
    icon: DownloadCloud,
  },
  {
    id: 2,
    title: "Memuat Aturan Coding SOP",
    description: "Menyiapkan basis standar kepatuhan coding dan aturan keamanan...",
    targetProgress: 42,
    icon: ShieldCheck,
  },
  {
    id: 3,
    title: "Deep-Scan Analisis Kode",
    description: "Memindai seluruh baris diff, logika fungsi, dan deteksi anomali keamanan...",
    targetProgress: 70,
    icon: Cpu,
  },
  {
    id: 4,
    title: "Menyusun Skor & Rekomendasi",
    description: "Mengkalkulasi skor kepatuhan SOP dan memformulasikan rekomendasi akhir...",
    targetProgress: 88,
    icon: FileCheck2,
  },
  {
    id: 5,
    title: "Menyematkan Komentar Peninjauan",
    description: "Menyematkan komentar inline langsung pada baris kode Bitbucket Server...",
    targetProgress: 100,
    icon: MessageSquareCode,
  },
];

export function ReviewProgressModal({
  open,
  onOpenChange,
  prId,
  bitbucketPrId,
  onCompleted,
}: ReviewProgressModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const [progress, setProgress] = React.useState<number>(10);
  const [status, setStatus] = React.useState<"IDLE" | "RUNNING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [summaryData, setSummaryData] = React.useState<{ totalIssues: number; sopScore: number } | null>(null);

  React.useEffect(() => {
    if (!open) {
      // Reset state when closed
      setCurrentStep(1);
      setProgress(10);
      setStatus("IDLE");
      setErrorMessage(null);
      setSummaryData(null);
      return;
    }

    let isMounted = true;
    setStatus("RUNNING");
    setCurrentStep(1);
    setProgress(15);

    // Simulated progressive ticker while fetch runs
    const stepInterval = setInterval(() => {
      if (!isMounted) return;
      setCurrentStep((prev) => {
        if (prev < 4) {
          const next = prev + 1;
          const target = STAGES[next - 1]?.targetProgress ?? 90;
          setProgress(target);
          return next;
        }
        return prev;
      });
    }, 2800);

    const runReview = async () => {
      try {
        const res = await fetch(`/api/pull-requests/${prId}/trigger-review`, {
          method: "POST",
        });
        const data = await res.json();

        if (!isMounted) return;
        clearInterval(stepInterval);

        if (res.ok && data.success) {
          setCurrentStep(5);
          setProgress(100);
          setStatus("SUCCESS");
          setSummaryData({
            totalIssues: data.data?.totalIssues ?? 0,
            sopScore: data.data?.sopScore ?? 100,
          });

          toast.success("Analisis AI Berhasil Selesai!", {
            description: `Ditemukan ${data.data?.totalIssues ?? 0} temuan, skor kepatuhan SOP: ${data.data?.sopScore ?? 100}%.`,
          });

          // Give user a moment to see 100% completion before refreshing
          setTimeout(() => {
            if (isMounted) {
              onOpenChange(false);
              if (onCompleted) {
                onCompleted();
              } else {
                router.refresh();
              }
            }
          }, 1800);
        } else {
          setStatus("ERROR");
          const errorMsg = data.message || data.error?.details?.[0] || "Gagal memproses analisis AI.";
          setErrorMessage(errorMsg);
          toast.error("Gagal menjalankan Analisis AI", {
            description: errorMsg,
          });
        }
      } catch (_err) {
        if (!isMounted) return;
        clearInterval(stepInterval);
        setStatus("ERROR");
        const errMsg = "Terjadi kesalahan jaringan saat memindai kode.";
        setErrorMessage(errMsg);
        toast.error(errMsg);
      }
    };

    void runReview();

    return () => {
      isMounted = false;
      clearInterval(stepInterval);
    };
  }, [open, prId, router, onOpenChange, onCompleted]);

  return (
    <Dialog open={open} onOpenChange={status === "RUNNING" ? undefined : onOpenChange}>
      <DialogContent className="border shadow-xl sm:max-w-[540px]">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-base">
                {status === "SUCCESS"
                  ? "Analisis Kode Selesai"
                  : status === "ERROR"
                    ? "Analisis Kode Terkendala"
                    : `Memindai Pull Request #${bitbucketPrId}`}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                {status === "SUCCESS"
                  ? "Hasil peninjauan dan temuan kepatuhan SOP telah siap."
                  : status === "ERROR"
                    ? "Silakan periksa pesan kesalahan di bawah dan coba kembali."
                    : "Pemeriksaan otomatis standar SOP kode dan keamanan Bitbucket Server."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Main Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Progres Pemindaian</span>
              <span className="font-bold font-mono text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 transition-all duration-500" />
          </div>

          {/* Stepper Ticker Stages */}
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            {STAGES.map((stage) => {
              const isDone = currentStep > stage.id || status === "SUCCESS";
              const isCurrent = currentStep === stage.id && status === "RUNNING";
              const _isPending = currentStep < stage.id && status !== "SUCCESS";
              const _Icon = stage.icon;

              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-3 rounded-md p-2 text-xs transition-all duration-200 ${
                    isCurrent
                      ? "border border-primary/20 bg-background shadow-xs"
                      : isDone
                        ? "opacity-90"
                        : "opacity-40"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <Clock className="size-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-medium ${isCurrent ? "font-semibold text-foreground" : "text-foreground"}`}
                      >
                        {stage.title}
                      </span>
                      {isDone && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/20 bg-emerald-500/10 px-1 py-0 text-[10px] text-emerald-600"
                        >
                          Selesai
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge
                          variant="outline"
                          className="animate-pulse border-primary/30 px-1 py-0 text-[10px] text-primary"
                        >
                          Memproses...
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Banner if failed */}
          {status === "ERROR" && errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs">
              <XCircle className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Kesalahan Saat Pemindaian:</span>
                <p className="mt-0.5 text-muted-foreground">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success summary preview */}
          {status === "SUCCESS" && summaryData && (
            <div className="flex items-center justify-around rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
              <div>
                <div className="font-bold font-mono text-foreground text-xl">{summaryData.totalIssues}</div>
                <div className="text-[11px] text-muted-foreground">Isu Terdeteksi</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="font-bold font-mono text-emerald-600 text-xl dark:text-emerald-400">
                  {summaryData.sopScore}%
                </div>
                <div className="text-[11px] text-muted-foreground">Kepatuhan SOP</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t pt-2">
          {status === "ERROR" && (
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
              Tutup
            </Button>
          )}
          {status === "RUNNING" && (
            <span className="mr-auto text-[11px] text-muted-foreground italic">
              Proses ini berjalan di server Bitbucket, mohon tidak menutup halaman...
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
