"use client";

import * as React from "react";
import { toast } from "sonner";

import type { CodingSop, SopCategory } from "@/data/code-review/types";
import { LocalSopGuide } from "./local-sop-guide";
import { SopCategoryDialog } from "./sop-category-dialog";
import { SopImportDialog } from "./sop-import-dialog";
import { SopsHeader } from "./sops-header";
import { SopsList } from "./sops-list";

export function SopsManagerView() {
  const [sops, setSops] = React.useState<CodingSop[]>([]);
  const [categories, setCategories] = React.useState<SopCategory[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);

  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sops/categories");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data kategori SOP:", err);
    }
  }, []);

  const fetchSops = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sops");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSops(json.data);
        } else {
          setSops([]);
        }
      } else {
        setSops([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data SOP:", err);
      setSops([]);
    }
  }, []);

  React.useEffect(() => {
    fetchSops();
    fetchCategories();
  }, [fetchSops, fetchCategories]);

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/sops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: enabled }),
      });
      if (res.ok) {
        setSops((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, isEnabled: enabled, updatedAt: new Date().toISOString() } : s
          )
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
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`SOP "${title}" berhasil dihapus.`);
        setSops((prev) => prev.filter((s) => s.id !== id));
        fetchCategories(); // update counts
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
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SopsList
            sops={sops}
            categories={categories}
            onToggleEnabled={handleToggleEnabled}
            onDeleteSop={handleDeleteSop}
          />
        </div>

        <div>
          <LocalSopGuide />
        </div>
      </div>

      {/* Category Management Modal */}
      <SopCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onCategoriesUpdated={() => {
          fetchCategories();
          fetchSops();
        }}
      />

      {/* Drag & Drop .md Import Modal */}
      <SopImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportSuccess={() => {
          fetchSops();
          fetchCategories();
        }}
      />
    </div>
  );
}
