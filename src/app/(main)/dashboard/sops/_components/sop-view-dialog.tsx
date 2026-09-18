import Link from "next/link";

import { Calendar, Edit2, Globe, HardDrive, User } from "lucide-react";

import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden rounded-xl border p-0 shadow-xl sm:max-w-[800px]">
        {/* Header */}
        <DialogHeader className="space-y-3 border-b bg-muted/20 p-6 pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="font-bold text-base text-foreground sm:text-lg">{sop.title}</DialogTitle>

              {/* Status badge */}
              <Badge
                variant="outline"
                className={
                  sop.isEnabled
                    ? "border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600"
                    : "border-zinc-500/30 bg-zinc-500/10 text-[10px] text-zinc-500"
                }
              >
                {sop.isEnabled ? "Aktif" : "Nonaktif"}
              </Badge>

              {/* Scope badge */}
              {isRepoScope ? (
                <Badge variant="outline" className="gap-1 border-primary/30 font-mono text-[10px] text-primary">
                  <HardDrive className="size-2.5" />
                  {repoName}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 font-mono text-[10px] text-muted-foreground">
                  <Globe className="size-2.5" />
                  Global
                </Badge>
              )}

              {/* Category badge */}
              <Badge variant="secondary" className="font-medium text-[10px]">
                {categoryName}
              </Badge>
            </div>

            {sop.summary && (
              <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
                {sop.summary}
              </DialogDescription>
            )}
          </div>

          {/* Metadata info bar */}
          <div className="flex items-center gap-5 border-border/40 border-t pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="size-3 text-muted-foreground" />
              <span>Dibuat oleh:</span>
              <strong className="font-medium text-foreground">{sop.createdBy}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3 text-muted-foreground" />
              <span>Terakhir diperbarui:</span>
              <span className="font-medium text-foreground">
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
        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
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
        <div className="flex shrink-0 items-center justify-between border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 font-medium text-xs">
            <Link href={`/dashboard/sops/${sop.id}/edit`}>
              <Edit2 className="size-3" />
              Edit SOP Ini
            </Link>
          </Button>

          <Button size="sm" onClick={() => onOpenChange(false)} className="h-8 px-4 font-medium text-xs">
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
