"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { PullRequest, SeniorDecision } from "@/data/code-review/types";
import { ReviewProgressModal } from "./review-progress-modal";

interface SeniorActionBarProps {
  pr: PullRequest;
}

export function SeniorActionBar({ pr }: SeniorActionBarProps) {
  const router = useRouter();
  const [currentDecision, setCurrentDecision] = React.useState<SeniorDecision>(pr.seniorDecision);
  const [decisionNotes, setDecisionNotes] = React.useState<string>(pr.seniorNotes || "");
  const [decidedAt, setDecidedAt] = React.useState<string | undefined>(pr.decidedAt);

  // Modal states
  const [isProgressModalOpen, setIsProgressModalOpen] = React.useState(false);
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isNeedsWorkOpen, setIsNeedsWorkOpen] = React.useState(false);
  const [isDeclineOpen, setIsDeclineOpen] = React.useState(false);

  // Form inputs
  const [notesInput, setNotesInput] = React.useState("");
  const [declineReasonInput, setDeclineReasonInput] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isNotStarted = pr.aiReviewStatus === "NOT_STARTED";
  const isInProgress = pr.aiReviewStatus === "IN_PROGRESS";

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/pull-requests/${pr.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentDecision("APPROVED");
        setDecidedAt(new Date().toISOString());
        setIsApproveOpen(false);
        toast.success("Pull Request Berhasil Disetujui!", {
          description: `Status persetujuan telah dikirim ke Bitbucket Server untuk PR #${pr.bitbucketPrId}.`,
        });
        router.refresh();
      } else {
        toast.error(data.message || "Gagal menyetujui Pull Request");
      }
    } catch (err) {
      console.error("Approve error:", err);
      toast.error("Terjadi kendala koneksi saat menyetujui PR.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNeedsWork = async () => {
    if (!notesInput.trim()) {
      toast.error("Catatan revisi wajib diisi untuk developer.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/pull-requests/${pr.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "NEEDS_WORK", notes: notesInput.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentDecision("NEEDS_WORK");
        setDecisionNotes(notesInput);
        setDecidedAt(new Date().toISOString());
        setIsNeedsWorkOpen(false);
        toast.warning("Status Diubah Menjadi 'Perlu Revisi'", {
          description: `Catatan revisi berhasil disematkan pada PR #${pr.bitbucketPrId} di Bitbucket Server.`,
        });
        router.refresh();
      } else {
        toast.error(data.message || "Gagal mengirim status Perlu Revisi");
      }
    } catch (err) {
      console.error("Needs work error:", err);
      toast.error("Terjadi kendala koneksi saat mengirim status Perlu Revisi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReasonInput.trim()) {
      toast.error("Alasan penolakan PR wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/pull-requests/${pr.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DECLINE", notes: declineReasonInput.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentDecision("DECLINED");
        setDecisionNotes(declineReasonInput);
        setDecidedAt(new Date().toISOString());
        setIsDeclineOpen(false);
        toast.error("Pull Request Telah Ditolak", {
          description: `PR #${pr.bitbucketPrId} telah ditutup di Bitbucket Server.`,
        });
        router.refresh();
      } else {
        toast.error(data.message || "Gagal menolak Pull Request");
      }
    } catch (err) {
      console.error("Decline error:", err);
      toast.error("Terjadi kendala koneksi saat menolak PR.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 5-Stage Animated AI Progress Modal */}
      <ReviewProgressModal
        open={isProgressModalOpen}
        onOpenChange={setIsProgressModalOpen}
        prId={pr.id}
        bitbucketPrId={pr.bitbucketPrId}
        onCompleted={() => {
          router.refresh();
        }}
      />

      {/* Sticky Action Container */}
      <div className="sticky top-12 z-30 flex flex-col gap-3 rounded-lg border border-border/80 bg-background/95 p-3.5 shadow-sm backdrop-blur-md xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-md bg-primary/10 p-2 text-primary shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Keputusan Senior Engineer:
              </span>
              {currentDecision === "PENDING" && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs shrink-0 whitespace-nowrap"
                >
                  Menunggu Keputusan
                </Badge>
              )}
              {currentDecision === "APPROVED" && (
                <Badge className="bg-emerald-600 text-white text-xs gap-1 shrink-0 whitespace-nowrap">
                  <Check className="size-3" /> Disetujui (Approved)
                </Badge>
              )}
              {currentDecision === "NEEDS_WORK" && (
                <Badge className="bg-amber-600 text-white text-xs gap-1 shrink-0 whitespace-nowrap">
                  <AlertCircle className="size-3" /> Perlu Revisi (Needs Work)
                </Badge>
              )}
              {currentDecision === "DECLINED" && (
                <Badge variant="destructive" className="text-xs gap-1 shrink-0 whitespace-nowrap">
                  <XCircle className="size-3" /> Ditolak (Declined)
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground pt-0.5">
              {decidedAt ? (
                <>
                  Tindakan dieksekusi pada{" "}
                  <span className="font-mono text-foreground">{new Date(decidedAt).toLocaleTimeString("id-ID")} WIB</span>
                </>
              ) : isNotStarted ? (
                "Analisis AI belum dijalankan. Tekan tombol Mulai Analisis AI untuk memindai kepatuhan SOP kode."
              ) : (
                "Silakan periksa rekomendasi AI dan diff sebelum mengeksekusi tindakan ke Bitbucket Server."
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap self-start xl:self-center">
          {/* If NOT_STARTED, show prominent Start Review button */}
          {isNotStarted ? (
            <Button
              size="sm"
              onClick={() => setIsProgressModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm font-semibold text-xs shrink-0 px-4"
            >
              <Sparkles className="size-3.5" />
              Mulai Analisis AI
            </Button>
          ) : isInProgress ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsProgressModalOpen(true)}
              className="border-primary/40 text-primary bg-primary/10 gap-1.5 text-xs font-medium shrink-0 animate-pulse"
            >
              <Sparkles className="size-3.5 animate-spin" />
              Sedang Menganalisis...
            </Button>
          ) : (
            <>
              {/* Re-run AI review button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsProgressModalOpen(true)}
                className="gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap bg-muted hover:bg-muted/80 text-foreground"
                title="Jalankan ulang pemindaian AI terhadap commit terbaru"
              >
                <RotateCcw className="size-3.5 text-muted-foreground" />
                Analisis Ulang AI
              </Button>

              {/* 1-Click Execution Buttons */}
              <Button
                size="sm"
                onClick={() => setIsApproveOpen(true)}
                disabled={currentDecision === "APPROVED"}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs font-medium text-xs shrink-0 whitespace-nowrap"
              >
                <CheckCircle2 className="size-3.5" />
                Setujui
              </Button>

              <Button
                size="sm"
                onClick={() => setIsNeedsWorkOpen(true)}
                variant="outline"
                className="border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 gap-1.5 font-medium text-xs shrink-0 whitespace-nowrap"
              >
                <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                Minta Revisi
              </Button>

              <Button
                size="sm"
                onClick={() => setIsDeclineOpen(true)}
                disabled={currentDecision === "DECLINED"}
                variant="destructive"
                className="gap-1.5 text-xs font-medium shadow-xs shrink-0 whitespace-nowrap"
              >
                <XCircle className="size-3.5" />
                Tolak
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Decision Notes Display if exists */}
      {decisionNotes && currentDecision !== "PENDING" && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
          <span className="font-semibold text-amber-800 dark:text-amber-300">Catatan Peninjau untuk Developer:</span>
          <p className="text-foreground mt-1 whitespace-pre-wrap font-sans">{decisionNotes}</p>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              Setujui Pull Request #{pr.bitbucketPrId}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Persetujuan akan dikirim dan dicatat langsung ke Bitbucket Server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs text-muted-foreground">
            <p>
              Pastikan Anda telah memeriksa temuan AI dan yakin kode siap digabungkan ke branch{" "}
              <strong className="text-foreground font-mono">{pr.targetBranch}</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsApproveOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold"
            >
              {isSubmitting ? "Mengirim ke Bitbucket..." : "Konfirmasi Setujui"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Needs Work Dialog */}
      <Dialog open={isNeedsWorkOpen} onOpenChange={setIsNeedsWorkOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              Minta Revisi Kode (Needs Work)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Status Perlu Revisi dan catatan Anda akan dicatat langsung pada Pull Request di Bitbucket Server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label htmlFor="needs-work-notes" className="text-xs font-semibold text-foreground">
                Catatan Revisi untuk Developer: <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="needs-work-notes"
                placeholder="Jelaskan hal-hal yang perlu diperbaiki atau disesuaikan sebelum PR disetujui..."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNeedsWorkOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleNeedsWork}
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs font-semibold"
            >
              {isSubmitting ? "Mengirim Catatan..." : "Kirim Revisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <XCircle className="size-5" />
              Tolak Pull Request (Decline)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pull request akan ditutup secara permanen di Bitbucket Server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label htmlFor="decline-reason" className="text-xs font-semibold text-foreground">
                Alasan Penolakan: <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="decline-reason"
                placeholder="Tuliskan alasan mendasar penolakan PR ini..."
                value={declineReasonInput}
                onChange={(e) => setDeclineReasonInput(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDeclineOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDecline}
              disabled={isSubmitting}
              className="gap-1.5 text-xs font-semibold"
            >
              {isSubmitting ? "Menutup PR..." : "Konfirmasi Tolak PR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
