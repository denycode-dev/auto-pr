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
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AiProvider } from "@/server/db/settings";

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

  // Modal Stage: CONFIG -> RUNNING -> SUCCESS | ERROR
  const [modalStage, setModalStage] = React.useState<"CONFIG" | "RUNNING" | "SUCCESS" | "ERROR">("CONFIG");

  // Providers & Selection State
  const [providers, setProviders] = React.useState<AiProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = React.useState<string>("");
  const [selectedModel, setSelectedModel] = React.useState<string>("");
  const [freshScan, setFreshScan] = React.useState<boolean>(true);
  const [isLoadingProviders, setIsLoadingProviders] = React.useState<boolean>(false);

  // Stepper & Progress State
  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const [progress, setProgress] = React.useState<number>(10);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [summaryData, setSummaryData] = React.useState<{ totalIssues: number; sopScore: number } | null>(null);

  // Load providers when modal opens
  React.useEffect(() => {
    if (!open) {
      setModalStage("CONFIG");
      setCurrentStep(1);
      setProgress(10);
      setErrorMessage(null);
      setSummaryData(null);
      return;
    }

    const fetchProviders = async () => {
      setIsLoadingProviders(true);
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data?.aiProviders)) {
          const list: AiProvider[] = json.data.aiProviders;
          setProviders(list);

          const defaultProv = list.find((p) => p.isDefault) || list[0];
          if (defaultProv) {
            setSelectedProviderId(defaultProv.id);
            // Sort models by usage frequency
            const sortedModels = [...defaultProv.models].sort((a, b) => {
              const countA = defaultProv.modelUsage?.[a] || 0;
              const countB = defaultProv.modelUsage?.[b] || 0;
              return countB - countA;
            });
            setSelectedModel(defaultProv.defaultModel || sortedModels[0] || "deepseek-flash");
          }
        }
      } catch (err) {
        console.warn("Gagal memuat provider AI untuk scan:", err);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    void fetchProviders();
  }, [open]);

  // Current selected provider object
  const currentProvider = React.useMemo(() => {
    return providers.find((p) => p.id === selectedProviderId) || providers[0];
  }, [providers, selectedProviderId]);

  // Models for selected provider, sorted by most frequently used
  const sortedModelsForCurrentProvider = React.useMemo(() => {
    if (!currentProvider?.models) return [];
    return [...currentProvider.models].sort((a, b) => {
      const countA = currentProvider.modelUsage?.[a] || 0;
      const countB = currentProvider.modelUsage?.[b] || 0;
      if (countB !== countA) return countB - countA;
      if (a === currentProvider.defaultModel) return -1;
      if (b === currentProvider.defaultModel) return 1;
      return a.localeCompare(b);
    });
  }, [currentProvider]);

  // Handle changing provider
  const handleProviderChange = (newProviderId: string) => {
    setSelectedProviderId(newProviderId);
    const target = providers.find((p) => p.id === newProviderId);
    if (target) {
      const sorted = [...target.models].sort((a, b) => {
        const countA = target.modelUsage?.[a] || 0;
        const countB = target.modelUsage?.[b] || 0;
        return countB - countA;
      });
      setSelectedModel(target.defaultModel || sorted[0] || "deepseek-flash");
    }
  };

  // Start the scan
  const handleStartReview = async () => {
    setModalStage("RUNNING");
    setCurrentStep(1);
    setProgress(15);
    setErrorMessage(null);

    const isMounted = true;

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

    try {
      const res = await fetch(`/api/pull-requests/${prId}/trigger-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: selectedProviderId,
          model: selectedModel,
          freshScan,
        }),
      });
      const data = await res.json();

      if (!isMounted) return;
      clearInterval(stepInterval);

      if (res.ok && data.success) {
        setCurrentStep(5);
        setProgress(100);
        setModalStage("SUCCESS");
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
        setModalStage("ERROR");
        const errorMsg = data.message || data.error?.details?.[0] || "Gagal memproses analisis AI.";
        setErrorMessage(errorMsg);
        toast.error("Gagal menjalankan Analisis AI", {
          description: errorMsg,
        });
      }
    } catch {
      if (!isMounted) return;
      clearInterval(stepInterval);
      setModalStage("ERROR");
      const errMsg = "Terjadi kesalahan jaringan saat memindai kode.";
      setErrorMessage(errMsg);
      toast.error(errMsg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={modalStage === "RUNNING" ? undefined : onOpenChange}>
      <DialogContent className="border shadow-xl sm:max-w-[540px]">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-base">
                {modalStage === "CONFIG"
                  ? `Mulai Analisis AI PR #${bitbucketPrId}`
                  : modalStage === "SUCCESS"
                    ? "Analisis Kode Selesai"
                    : modalStage === "ERROR"
                      ? "Analisis Kode Terkendala"
                      : `Memindai Pull Request #${bitbucketPrId}`}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                {modalStage === "CONFIG"
                  ? "Pilih provider AI dan model untuk mengevaluasi diff dan kepatuhan SOP."
                  : modalStage === "SUCCESS"
                    ? "Hasil peninjauan dan temuan kepatuhan SOP telah siap."
                    : modalStage === "ERROR"
                      ? "Silakan periksa pesan kesalahan di bawah dan coba kembali."
                      : `Menggunakan ${currentProvider?.name || "AI"} (${selectedModel})`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* STAGE 1: Configuration & Provider/Model Selection */}
        {modalStage === "CONFIG" && (
          <div className="space-y-4 py-2 text-xs">
            {isLoadingProviders ? (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Memuat daftar provider AI...</span>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {/* Select Provider */}
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-xs">Penyedia Model AI (Provider)</Label>
                    <Select value={selectedProviderId} onValueChange={handleProviderChange}>
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="Pilih Provider AI..." />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        {providers.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.isDefault && (
                                <Badge
                                  variant="secondary"
                                  className="border-primary/20 bg-primary/10 px-1 py-0 text-[9px] text-primary"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Model - Sorted by Usage Frequency */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-xs">Pilihan Model AI</Label>
                      <span className="text-[10px] text-muted-foreground italic">
                        Diurutkan dari yang paling sering dipakai
                      </span>
                    </div>

                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="h-9 w-full font-mono text-xs">
                        <SelectValue placeholder="Pilih Model AI..." />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        {sortedModelsForCurrentProvider.map((m, idx) => {
                          const count = currentProvider?.modelUsage?.[m] || 0;
                          const isTop = idx === 0 && count > 0;
                          return (
                            <SelectItem key={m} value={m} className="font-mono text-xs">
                              <div className="flex w-full items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                  {isTop && <Star className="size-3 shrink-0 fill-amber-500 text-amber-500" />}
                                  <span>{m}</span>
                                  {m === currentProvider?.defaultModel && (
                                    <span className="font-sans text-[9px] text-muted-foreground">(Default)</span>
                                  )}
                                </div>
                                {count > 0 && (
                                  <span className="ml-2 font-sans text-[10px] text-muted-foreground">
                                    {count}x dipakai
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quick Info Summary Box */}
                <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Endpoint:</span>
                    <span className="max-w-[260px] truncate font-mono">{currentProvider?.baseUrl}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Model Terpilih:</span>
                    <span className="font-mono font-semibold text-foreground">{selectedModel}</span>
                  </div>
                </div>

                {/* Fresh Scan Option */}
                <div className="flex items-start space-x-2.5 rounded-lg border bg-muted/20 p-2.5">
                  <Checkbox
                    id="fresh-scan"
                    checked={freshScan}
                    onCheckedChange={(checked) => setFreshScan(Boolean(checked))}
                    className="mt-0.5"
                  />
                  <div className="grid gap-1 leading-none">
                    <label htmlFor="fresh-scan" className="cursor-pointer font-medium text-foreground text-xs">
                      Evaluasi Ulang Penuh (Gunakan aturan SOP terkini)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Memindai ulang seluruh kode diff dengan standar SOP terbaru dan model yang dipilih tanpa
                      mensupresi draf lama.
                    </p>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-2 border-t pt-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleStartReview}
                    className="gap-1.5 bg-primary font-semibold text-primary-foreground text-xs"
                  >
                    <Sparkles className="size-3.5" />
                    Mulai Pemindaian
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STAGE 2: Running Progress, Success, or Error */}
        {modalStage !== "CONFIG" && (
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
                const isDone = currentStep > stage.id || modalStage === "SUCCESS";
                const isCurrent = currentStep === stage.id && modalStage === "RUNNING";
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
            {modalStage === "ERROR" && errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs">
                <XCircle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold">Kesalahan Saat Pemindaian:</span>
                  <p className="mt-0.5 text-muted-foreground">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Success summary preview */}
            {modalStage === "SUCCESS" && summaryData && (
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

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 border-t pt-2">
              {modalStage === "ERROR" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
                    Tutup
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setModalStage("CONFIG")}
                    className="gap-1.5 font-semibold text-xs"
                  >
                    <RotateCcw className="size-3.5" />
                    Coba Lagi
                  </Button>
                </>
              )}
              {modalStage === "RUNNING" && (
                <span className="mr-auto text-[11px] text-muted-foreground italic">
                  Proses analisis sedang berjalan dengan {currentProvider?.name} ({selectedModel})...
                </span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
