"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Bold,
  Check,
  Code,
  Eye,
  FileCode,
  FileEdit,
  Globe,
  HardDrive,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Save,
  Shield,
  Sparkles,
  SplitSquareVertical,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CodingSop, Repository, SopCategory } from "@/data/code-review/types";

interface SopDualPaneEditorProps {
  initialSop?: Partial<CodingSop> | null;
  mode: "create" | "edit";
}

export function SopDualPaneEditor({ initialSop, mode }: SopDualPaneEditorProps) {
  const router = useRouter();
  const [categories, setCategories] = React.useState<SopCategory[]>([]);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [title, setTitle] = React.useState(initialSop?.title ?? "");
  const [categoryId, setCategoryId] = React.useState(initialSop?.categoryId ?? "");
  const [scope, setScope] = React.useState<"GLOBAL" | "REPOSITORY">(
    initialSop?.scope === "REPOSITORY" ? "REPOSITORY" : "GLOBAL",
  );
  const [repositoryId, setRepositoryId] = React.useState(initialSop?.repositoryId ?? "");
  const [summary, setSummary] = React.useState(initialSop?.summary ?? "");
  const [rulesMarkdown, setRulesMarkdown] = React.useState(
    initialSop?.rulesMarkdown ??
      `# Aturan Kualitas & Kepatuhan Kode

Jelaskan ringkasan standar kode dan panduan yang wajib dipatuhi oleh developer.

## Ketentuan & Standar:
1. Pastikan setiap operasi sensitif dibungkus dengan exception handling yang sesuai.
2. Jangan meninggalkan console.log atau credential rahasia di dalam kode.
3. Gunakan penamaan variabel dan fungsi yang deskriptif dan konsisten.

\`\`\`typescript
// Contoh kode yang disarankan:
export async function fetchUserData(userId: string): Promise<User> {
  if (!userId) throw new InvalidParamError("userId wajib diisi");
  return await db.user.findUnique({ where: { id: userId } });
}
\`\`\`
`,
  );

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    fetch("/api/sops/categories")
      .then(async (r) => {
        if (!r.ok) return null;
        const text = await r.text();
        return text.trim() ? JSON.parse(text) : null;
      })
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setCategories(res.data);
          if (!categoryId && res.data.length > 0) {
            setCategoryId(res.data[0].id);
          }
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
  }, [categoryId]);

  const insertText = (before: string, after = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const replacement = before + (selected || "teks") + after;

    const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

    setRulesMarkdown(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected ? selected.length : 4));
    }, 0);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Judul SOP wajib diisi.");
      return;
    }
    if (!rulesMarkdown.trim()) {
      toast.error("Isi aturan Markdown tidak boleh kosong.");
      return;
    }
    if (scope === "REPOSITORY" && !repositoryId) {
      toast.error("Pilih repositori target untuk SOP cakupan repositori.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        categoryId: categoryId || undefined,
        scope,
        repositoryId: scope === "REPOSITORY" ? repositoryId : null,
        summary: summary.trim() || undefined,
        rulesMarkdown: rulesMarkdown.trim(),
        isEnabled: initialSop?.isEnabled ?? true,
      };

      const url = mode === "edit" && initialSop?.id ? `/api/sops/${initialSop.id}` : "/api/sops";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const data = text.trim() ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        toast.success(mode === "edit" ? "Coding SOP berhasil diperbarui!" : "Coding SOP baru berhasil dibuat!");
        router.push("/dashboard/sops");
        router.refresh();
      } else {
        toast.error(data.message || "Gagal menyimpan SOP.");
      }
    } catch (err) {
      console.error("Save SOP error:", err);
      toast.error("Terjadi kesalahan koneksi saat menyimpan SOP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Simple Markdown renderer
  const renderMarkdownPreview = (text: string) => {
    const lines = text.split("\n");
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${idx}`}
              className="my-3 rounded-lg bg-zinc-950 p-3 font-mono text-xs text-emerald-400 overflow-x-auto border border-zinc-800"
            >
              {codeBlockContent.join("\n")}
            </pre>,
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      const trimmed = line.trim();

      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1 key={idx} className="text-xl font-bold tracking-tight text-foreground mt-4 mb-2">
            {trimmed.replace(/^#\s+/, "")}
          </h1>,
        );
      } else if (trimmed.startsWith("## ")) {
        elements.push(
          <h2 key={idx} className="text-base font-semibold text-foreground mt-4 mb-1.5 border-b pb-1">
            {trimmed.replace(/^##\s+/, "")}
          </h2>,
        );
      } else if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={idx} className="text-sm font-semibold text-foreground mt-3 mb-1">
            {trimmed.replace(/^###\s+/, "")}
          </h3>,
        );
      } else if (trimmed.startsWith("> ")) {
        elements.push(
          <blockquote
            key={idx}
            className="my-2 border-l-4 border-primary/40 bg-muted/30 px-3 py-1.5 italic text-muted-foreground text-xs rounded-r"
          >
            {trimmed.replace(/^>\s+/, "")}
          </blockquote>,
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <li key={idx} className="ml-4 list-disc text-xs text-foreground/90 my-0.5">
            {trimmed.replace(/^[-*]\s+/, "")}
          </li>,
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={idx} className="ml-4 list-decimal text-xs text-foreground/90 my-0.5">
            {trimmed.replace(/^\d+\.\s+/, "")}
          </li>,
        );
      } else if (trimmed === "---" || trimmed === "***") {
        elements.push(<hr key={idx} className="my-3 border-border" />);
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={idx} className="text-xs text-foreground/85 leading-relaxed my-1.5">
            {trimmed}
          </p>,
        );
      }
    });

    return elements;
  };

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* Top Header Navigation Bar */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-xs -ml-2 text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/sops">
              <ArrowLeft className="size-3.5" />
              Kembali ke Daftar SOP
            </Link>
          </Button>

          <span className="text-border">•</span>

          <h1 className="font-semibold text-base text-foreground">
            {mode === "edit" ? "Edit Coding SOP" : "Tulis Coding SOP Baru"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Save className="size-3.5" />
            {isSubmitting ? "Menyimpan..." : "Simpan SOP"}
          </Button>
        </div>
      </div>

      {/* Metadata Configuration Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Title */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="sop-title" className="text-xs">
              Judul SOP <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sop-title"
              placeholder="Contoh: Standar Penanganan Eksepsi & Log Error"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs font-medium"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Kategori SOP <span className="text-destructive">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Kategori..." />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scope Toggle */}
          <div className="space-y-1.5">
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
                Global (Semua Repo)
              </button>
              <button
                type="button"
                onClick={() => setScope("REPOSITORY")}
                className={`flex-1 py-1 rounded flex items-center justify-center gap-1.5 font-medium transition-all ${
                  scope === "REPOSITORY" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                <HardDrive className="size-3" />
                Khusus Repositori
              </button>
            </div>
          </div>

          {/* Repository Selector if REPOSITORY scope */}
          {scope === "REPOSITORY" && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Repositori Target <span className="text-destructive">*</span>
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
          <div className={`space-y-1.5 ${scope === "REPOSITORY" ? "" : "md:col-span-2"}`}>
            <Label htmlFor="sop-summary" className="text-xs">
              Ringkasan Singkat
            </Label>
            <Input
              id="sop-summary"
              placeholder="Penjelasan singkat aturan untuk developer..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* DUAL-PANE WORKSPACE: Left Editor, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch min-h-[560px]">
        {/* LEFT PANE: Editor & Toolbar */}
        <div className="flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden">
          {/* Editor Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <FileEdit className="size-3.5 text-primary" />
              <span>Markdown Editor</span>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => insertText("# ")}
                title="Heading 1"
              >
                <Heading1 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => insertText("## ")}
                title="Heading 2"
              >
                <Heading2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => insertText("**", "**")}
                title="Bold"
              >
                <Bold className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => insertText("*", "*")}
                title="Italic"
              >
                <Italic className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => insertText("```typescript\n", "\n```")}
                title="Code Block"
              >
                <Code className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => insertText("- ")}
                title="Bullet List"
              >
                <List className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                onClick={() => insertText("> ")}
                title="Quote"
              >
                <Quote className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Textarea */}
          <div className="flex-1 p-3 flex flex-col">
            <textarea
              ref={textareaRef}
              value={rulesMarkdown}
              onChange={(e) => setRulesMarkdown(e.target.value)}
              placeholder="Tuliskan aturan SOP dalam format Markdown..."
              className="flex-1 w-full resize-none font-mono text-xs bg-transparent focus:outline-none leading-relaxed text-foreground"
              rows={22}
            />
          </div>

          <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground font-mono">
            <span>{rulesMarkdown.split("\n").length} baris</span>
            <span>{rulesMarkdown.length} karakter</span>
          </div>
        </div>

        {/* RIGHT PANE: Live Markdown Preview */}
        <div className="flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden">
          {/* Preview Header Bar */}
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Eye className="size-3.5 text-primary" />
              <span>Live Preview Standar SOP</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {scope === "GLOBAL" ? "Cakupan Global" : "Khusus Repositori"}
              </Badge>
              {selectedCategory && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: selectedCategory.color || "#6366f1" }}
                  />
                  {selectedCategory.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Live Rendered Content */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[580px] space-y-2">
            {title && (
              <div className="border-b pb-3 mb-3">
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                {summary && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{summary}</p>}
              </div>
            )}

            {renderMarkdownPreview(rulesMarkdown)}
          </div>
        </div>
      </div>
    </div>
  );
}
