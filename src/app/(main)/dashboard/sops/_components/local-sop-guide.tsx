"use client";

import { GitFork } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LocalSopGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocalSopGuideDialog({ open, onOpenChange }: LocalSopGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[580px]">
        <div className="space-y-4 p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GitFork className="size-4" />
              </div>
              <div>
                <DialogTitle className="font-semibold text-base">
                  Panduan SOP Lokal Repositori (.review-rules.md)
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Aturan khusus per-proyek yang disimpan di root branch repositori Bitbucket.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 pt-1 text-muted-foreground text-xs leading-relaxed">
            <p>
              Sistem otomatis mengambil file{" "}
              <code className="rounded border bg-muted px-1.5 py-0.5 font-mono font-semibold text-foreground">
                .review-rules.md
              </code>{" "}
              langsung via REST API Bitbucket Server saat analisis AI dijalankan.
            </p>

            <div className="space-y-1 rounded-md border p-3.5 font-mono text-[11px] text-black">
              <div className="text-zinc-500">{"// Contoh struktur .review-rules.md di root project:"}</div>
              <div># Rules Khusus Repositori Payment Service</div>
              <div>- Wajib validasi format IBAN dan Swift Code dengan regex internal.</div>
              <div>- Dilarang bypass circuit breaker ke vendor payment partner.</div>
              <div>- Gunakan error code dengan prefix `FIN-PAY-XXXX`.</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="font-medium text-xs"
          >
            Tutup Panduan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export alias for compatibility
export const LocalSopGuide = LocalSopGuideDialog;
