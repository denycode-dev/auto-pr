"use client";

import * as React from "react";

import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  FileText,
  FileUp,
  Globe,
  HardDrive,
  Layers,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Repository, SopCategory } from "@/data/code-review/types";

interface SopImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

export function SopImportDialog({ open, onOpenChange, onImportSuccess }: SopImportDialogProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [categories, setCategories] = React.useState<SopCategory[]>([]);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);

  // Parsed / Form fields
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [scope, setScope] = React.useState<"GLOBAL" | "REPOSITORY">("GLOBAL");
  const [repositoryId, setRepositoryId] = React.useState<string>("");
  const [rulesMarkdown, setRulesMarkdown] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch categories & repositories on open
  React.useEffect(() => {
    if (open) {
      // Reset form
      setSelectedFile(null);
      setTitle("");
      setSummary("");
      setCategoryId("");
      setScope("GLOBAL");
      setRepositoryId("");
      setRulesMarkdown("");

      fetch("/api/sops/categories")
        .then(async (r) => {
          if (!r.ok) return null;
          const text = await r.text();
          return text.trim() ? JSON.parse(text) : null;
        })
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setCategories(res.data);
            if (res.data.length > 0) setCategoryId(res.data[0].id);
          }
        })
        .catch(console.error);

      fetch("/api/repositories")
        .then(async (r) => {
          if (!r.ok) return null;
          const text = await r.text();
          return text.trim() ? JSON.parse(text) : null;
        })
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setRepositories(res.data);
          }
        })
        .catch(console.error);
    }
  }, [open]);

  const parseMarkdownContent = (rawText: string, filename: string) => {
    const lines = rawText.split("\n");
    let extractedTitle = "";
    let extractedSummary = "";

    // 1. Look for first # Title
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ") && !extractedTitle) {
        extractedTitle = trimmed.replace(/^#\s+/, "").trim();
      } else if (
        !extractedSummary &&
        trimmed.length > 10 &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("```")
      ) {
        extractedSummary = trimmed.slice(0, 240);
      }

      if (extractedTitle && extractedSummary) break;
    }

    if (!extractedTitle) {
      // Fallback to filename without .md
      extractedTitle = filename
        .replace(/\.md$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    setTitle(extractedTitle);
    setSummary(extractedSummary || "Panduan aturan kualitas kode yang diimpor dari berkas Markdown.");
    setRulesMarkdown(rawText);
  };

  const handleFileDrop = (file: File) => {
    if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown")) {
      toast.error("Format berkas harus berupa file Markdown (.md).");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseMarkdownContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileDrop(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileDrop(e.target.files[0]);
    }
  };

  const handleSaveImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rulesMarkdown.trim()) {
      toast.error("Judul SOP dan isi aturan Markdown tidak boleh kosong.");
      return;
    }
    if (!categoryId) {
      toast.error("Silakan pilih kategori SOP.");
      return;
    }
    if (scope === "REPOSITORY" && !repositoryId) {
      toast.error("Pilih repositori target untuk SOP dengan cakupan repositori.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          categoryId,
          scope,
          repositoryId: scope === "REPOSITORY" ? repositoryId : undefined,
          summary: summary.trim() || undefined,
          rulesMarkdown: rulesMarkdown.trim(),
          isEnabled: true,
          createdBy: "Senior Lead (Import)",
        }),
      });
      const text = await res.text();
      const data = text.trim() ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        toast.success(`SOP "${title}" berhasil diimpor ke database!`);
        onOpenChange(false);
        onImportSuccess?.();
      } else {
        toast.error(data.message || "Gagal mengimpor SOP.");
      }
    } catch (err) {
      console.error("Import SOP error:", err);
      toast.error("Terjadi kesalahan saat mengimpor SOP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto border shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UploadCloud className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Import Panduan Coding SOP (.md)</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Unggah berkas Markdown panduan aturan kode tim untuk diintegrasikan ke sistem AI review.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSaveImport} className="space-y-4 py-2">
          {/* Dropzone */}
          {!selectedFile ? (
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[0.99]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <FileUp className="size-10 text-primary/70 mb-2" />
              <span className="text-xs font-semibold text-foreground">Tarik &amp; Lepaskan Berkas .md ke Sini</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">
                atau klik untuk memilih file dari komputer Anda (.md, .markdown)
              </span>
              <input type="file" accept=".md,.markdown" onChange={handleFileInputChange} className="hidden" />
            </label>
          ) : (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="flex items-center gap-2.5">
                <FileCode2 className="size-5 text-primary" />
                <div>
                  <span className="font-semibold text-foreground font-mono">{selectedFile.name}</span>
                  <span className="text-[10px] text-muted-foreground block">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {rulesMarkdown.split("\n").length} baris
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setTitle("");
                  setSummary("");
                  setRulesMarkdown("");
                }}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Ganti Berkas
              </Button>
            </div>
          )}

          {/* Configuration Form */}
          {selectedFile && (
            <div className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label htmlFor="import-title" className="text-xs">
                  Judul SOP <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="import-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Standar Penanganan Eksepsi & Logging"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selection */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    Kategori SOP <span className="text-destructive">*</span>
                  </Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor:
                                  (
                                    {
                                      indigo: "#6366f1",
                                      emerald: "#10b981",
                                      amber: "#f59e0b",
                                      rose: "#f43f5e",
                                      sky: "#0ea5e9",
                                      purple: "#a855f7",
                                      slate: "#64748b",
                                    } as Record<string, string>
                                  )[cat.colorBadge || "indigo"] || "#6366f1",
                              }}
                            />
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Scope Selection */}
                <div className="space-y-1">
                  <Label className="text-xs">Cakupan Aturan (Scope)</Label>
                  <div className="flex rounded-md border p-0.5 bg-muted/40 text-xs">
                    <button
                      type="button"
                      onClick={() => setScope("GLOBAL")}
                      className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 font-medium transition-all ${
                        scope === "GLOBAL" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      <Globe className="size-3" />
                      Global
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope("REPOSITORY")}
                      className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 font-medium transition-all ${
                        scope === "REPOSITORY" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      <HardDrive className="size-3" />
                      Repositori
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Repository if REPOSITORY scope */}
              {scope === "REPOSITORY" && (
                <div className="space-y-1">
                  <Label className="text-xs">
                    Pilih Repositori Sasaran <span className="text-destructive">*</span>
                  </Label>
                  <Select value={repositoryId} onValueChange={setRepositoryId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pilih repositori..." />
                    </SelectTrigger>
                    <SelectContent>
                      {repositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id} className="text-xs">
                          {repo.projectKey} / {repo.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-1">
                <Label htmlFor="import-summary" className="text-xs">
                  Ringkasan Panduan
                </Label>
                <Input
                  id="import-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Ringkasan singkat isi SOP untuk developer..."
                  className="h-8 text-xs"
                />
              </div>

              {/* Markdown preview snippet */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pratinjau Isi Aturan</Label>
                <div className="rounded-md border bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 max-h-[140px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {rulesMarkdown}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedFile || isSubmitting}
              className="text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? "Mengimpor..." : "Import & Simpan SOP"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
