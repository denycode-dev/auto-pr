import Link from "next/link";

import { Calendar, Edit2, Globe, HardDrive, User } from "lucide-react";

import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
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
import type { CodingSop } from "@/data/code-review/types";

interface SopViewDialogProps {
  sop: CodingSop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SopViewDialog({ sop, open, onOpenChange }: SopViewDialogProps) {
  if (!sop) return null;

  const isRepoScope = sop.scope === "REPOSITORY";
  const repoName =
    (sop.projectKey && sop.repositorySlug ? `${sop.projectKey}/${sop.repositorySlug}` : null) ??
    (sop.repository ? `${sop.repository.projectKey}/${sop.repository.slug}` : null) ??
    "Khusus Repositori";

  const categoryName =
    typeof sop.category === "string" ? sop.category : (sop.category?.name ?? sop.categoryName ?? "Umum");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[88vh] flex flex-col p-0 overflow-hidden border shadow-xl rounded-xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">{sop.title}</DialogTitle>

              {/* Status badge */}
              <Badge
                variant="outline"
                className={
                  sop.isEnabled
                    ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]"
                    : "border-zinc-500/30 text-zinc-500 bg-zinc-500/10 text-[10px]"
                }
              >
                {sop.isEnabled ? "Aktif" : "Nonaktif"}
              </Badge>

              {/* Scope badge */}
              {isRepoScope ? (
                <Badge variant="outline" className="text-[10px] font-mono gap-1 border-primary/30 text-primary">
                  <HardDrive className="size-2.5" />
                  {repoName}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-mono gap-1 text-muted-foreground">
                  <Globe className="size-2.5" />
                  Global
                </Badge>
              )}

              {/* Category badge */}
              <Badge variant="secondary" className="text-[10px] font-medium">
                {categoryName}
              </Badge>
            </div>

            {sop.summary && (
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                {sop.summary}
              </DialogDescription>
            )}
          </div>

          {/* Metadata info bar */}
          <div className="flex items-center gap-5 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            <span className="flex items-center gap-1.5">
              <User className="size-3 text-muted-foreground" />
              <span>Dibuat oleh:</span>
              <strong className="text-foreground font-medium">{sop.createdBy}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3 text-muted-foreground" />
              <span>Terakhir diperbarui:</span>
              <span className="text-foreground font-medium">
                {new Date(sop.updatedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </span>
          </div>
        </DialogHeader>

        {/* Scrollable Markdown Document Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {!sop.rulesMarkdown || sop.rulesMarkdown.trim().length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              <p className="text-xs">Dokumen SOP ini belum memiliki aturan atau konten markdown.</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card/60 p-5 shadow-2xs">
              <MarkdownRenderer content={sop.rulesMarkdown} />
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t bg-muted/10 flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" asChild className="text-xs h-8 gap-1.5 font-medium">
            <Link href={`/dashboard/sops/${sop.id}/edit`}>
              <Edit2 className="size-3" />
              Edit SOP Ini
            </Link>
          </Button>

          <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs h-8 px-4 font-medium">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
