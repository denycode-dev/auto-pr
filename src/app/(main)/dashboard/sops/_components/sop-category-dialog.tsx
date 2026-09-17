"use client";

import * as React from "react";

import { FolderPlus, Layers, Palette, Plus, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SopCategory } from "@/data/code-review/types";

interface SopCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesUpdated?: () => void;
}

const COLOR_PRESETS = [
  { label: "Rose", value: "#ef4444" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#10b981" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Slate", value: "#64748b" },
];

export function SopCategoryDialog({ open, onOpenChange, onCategoriesUpdated }: SopCategoryDialogProps) {
  const [categories, setCategories] = React.useState<SopCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [color, setColor] = React.useState("#6366f1");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchCategories = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sops/categories");
      if (!res.ok) return;
      const text = await res.text();
      if (!text.trim()) return;
      const data = JSON.parse(text);
      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      void fetchCategories();
      setIsCreating(false);
      setName("");
      setSlug("");
      setColor("#6366f1");
      setDescription("");
    }
  }, [open, fetchCategories]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Nama kategori dan slug wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sops/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          color,
          description: description.trim() || undefined,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        toast.success(`Kategori "${name}" berhasil dibuat`);
        setName("");
        setSlug("");
        setDescription("");
        setIsCreating(false);
        void fetchCategories();
        onCategoriesUpdated?.();
      } else {
        toast.error(data.message || "Gagal membuat kategori.");
      }
    } catch (err) {
      console.error("Create category error:", err);
      toast.error("Terjadi kesalahan koneksi saat membuat kategori.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: SopCategory) => {
    if (cat.sopCount && cat.sopCount > 0) {
      toast.error(
        `Kategori "${cat.name}" masih digunakan oleh ${cat.sopCount} aturan SOP. Pindahkan aturan terlebih dahulu.`,
      );
      return;
    }

    if (!confirm(`Hapus kategori "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/sops/categories/${cat.id}`, {
        method: "DELETE",
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        toast.success(`Kategori "${cat.name}" berhasil dihapus.`);
        void fetchCategories();
        onCategoriesUpdated?.();
      } else {
        toast.error(data.message || "Gagal menghapus kategori.");
      }
    } catch (err) {
      console.error("Delete category error:", err);
      toast.error("Terjadi kesalahan koneksi saat menghapus kategori.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] border shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Kelola Kategori Coding SOP</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kategori dinamis untuk mengelompokkan aturan standar kode &amp; kepatuhan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action button to show create form */}
          {!isCreating && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Daftar Kategori ({categories.length})</span>
              <Button size="sm" variant="outline" onClick={() => setIsCreating(true)} className="gap-1.5 text-xs h-8">
                <Plus className="size-3.5" />
                Tambah Kategori
              </Button>
            </div>
          )}

          {/* Create Category Form */}
          {isCreating && (
            <form onSubmit={handleCreateCategory} className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FolderPlus className="size-3.5 text-primary" />
                  Kategori Baru
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsCreating(false)}
                  className="size-6 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cat-name" className="text-xs">
                    Nama Kategori <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cat-name"
                    placeholder="Contoh: Performance"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cat-slug" className="text-xs">
                    Slug <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cat-slug"
                    placeholder="contoh: performance"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Color picker presets */}
              <div className="space-y-1">
                <Label className="text-xs">Warna Badge</Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setColor(p.value)}
                      className={`size-6 rounded-full border-2 transition-all ${
                        color === p.value
                          ? "scale-110 border-foreground shadow-xs"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: p.value }}
                      title={p.label}
                    />
                  ))}
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="size-6 p-0 border-0 rounded-full cursor-pointer ml-1"
                    title="Warna khusus"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cat-desc" className="text-xs">
                  Deskripsi Singkat
                </Label>
                <Input
                  id="cat-desc"
                  placeholder="Panduan optimasi performa query dan resource handling"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                  className="text-xs h-7"
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs h-7 font-semibold">
                  {isSubmitting ? "Menyimpan..." : "Simpan Kategori"}
                </Button>
              </div>
            </form>
          )}

          {/* Category List - Hidden when creating new category */}
          {!isCreating && (
            <div className="rounded-lg border divide-y max-h-[320px] overflow-y-auto">
              {categories.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  {isLoading ? "Memuat kategori..." : "Belum ada kategori terdaftar."}
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="size-3 rounded-full shrink-0"
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground truncate">{cat.name}</span>
                          <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">
                            {cat.slug}
                          </code>
                          {typeof cat.sopCount === "number" && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono">
                              {cat.sopCount} SOP
                            </Badge>
                          )}
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 max-w-sm">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteCategory(cat)}
                      className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
