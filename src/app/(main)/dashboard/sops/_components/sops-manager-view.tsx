"use client";

import * as React from "react";

import { toast } from "sonner";

import type { CodingSop, Repository, SopCategory } from "@/data/code-review/types";

import { LocalSopGuide } from "./local-sop-guide";
import { SopCategoryDialog } from "./sop-category-dialog";
import { SopImportDialog } from "./sop-import-dialog";
import { SopsHeader } from "./sops-header";
import { SopsList } from "./sops-list";

export function SopsManagerView() {
  const [sops, setSops] = React.useState<CodingSop[]>([]);
  const [categories, setCategories] = React.useState<SopCategory[]>([]);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isLocalGuideOpen, setIsLocalGuideOpen] = React.useState(false);

  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sops/categories");
      if (!res.ok) return;
      const text = await res.text();
      if (!text.trim()) return;
      const json = JSON.parse(text);
      if (json.success && Array.isArray(json.data)) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data kategori SOP:", err);
    }
  }, []);

  const fetchRepositories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/repositories");
      if (!res.ok) return;
      const text = await res.text();
      if (!text.trim()) return;
      const json = JSON.parse(text);
      if (json.success && Array.isArray(json.data)) {
        setRepositories(json.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data repositori:", err);
    }
  }, []);

  const fetchSops = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sops");
      if (!res.ok) {
        setSops([]);
        return;
      }
      const text = await res.text();
      if (!text.trim()) {
        setSops([]);
        return;
      }
      const json = JSON.parse(text);
      if (json.success && Array.isArray(json.data)) {
        setSops(json.data);
      } else {
        setSops([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data SOP:", err);
      setSops([]);
    }
  }, []);

  React.useEffect(() => {
    void fetchSops();
    void fetchCategories();
    void fetchRepositories();
  }, [fetchSops, fetchCategories, fetchRepositories]);

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/sops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: enabled }),
      });
      if (res.ok) {
        setSops((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isEnabled: enabled, updatedAt: new Date().toISOString() } : s)),
        );
        toast.success(`SOP ${enabled ? "diaktifkan" : "dinonaktifkan"}`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.message || "Gagal mengubah status SOP di database.");
      }
    } catch (err) {
      console.error("Could not sync toggle to DB:", err);
      toast.error("Terjadi kesalahan koneksi saat mengubah status SOP.");
    }
  };

  const handleDeleteSop = async (id: string, title: string) => {
    if (!confirm(`Hapus aturan SOP "${title}" secara permanen?`)) return;

    try {
      const res = await fetch(`/api/sops/${id}`, {
        method: "DELETE",
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        toast.success(`SOP "${title}" berhasil dihapus.`);
        setSops((prev) => prev.filter((s) => s.id !== id));
        void fetchCategories(); // update counts
      } else {
        toast.error(data.message || "Gagal menghapus SOP.");
      }
    } catch (err) {
      console.error("Delete SOP error:", err);
      toast.error("Terjadi kesalahan koneksi saat menghapus SOP.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SopsHeader
        onManageCategories={() => setIsCategoryDialogOpen(true)}
        onImportMd={() => setIsImportDialogOpen(true)}
        onOpenLocalGuide={() => setIsLocalGuideOpen(true)}
      />

      <SopsList
        sops={sops}
        categories={categories}
        repositories={repositories}
        onToggleEnabled={handleToggleEnabled}
        onDeleteSop={handleDeleteSop}
      />

      {/* Local SOP Guide Modal */}
      <LocalSopGuide open={isLocalGuideOpen} onOpenChange={setIsLocalGuideOpen} />

      {/* Category Management Modal */}
      <SopCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onCategoriesUpdated={() => {
          void fetchCategories();
          void fetchSops();
        }}
      />

      {/* Drag & Drop .md Import Modal */}
      <SopImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportSuccess={() => {
          void fetchSops();
          void fetchCategories();
        }}
      />
    </div>
  );
}
