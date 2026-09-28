"use client";

import * as React from "react";

import { toast } from "sonner";

import { PrDataTable } from "./pr-data-table";
import { PrQueueHeader } from "./pr-queue-header";
import { SyncPrDialog } from "./sync-pr-dialog";

export function PrQueueView() {
  const [isSyncOpen, setIsSyncOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/bitbucket/sync-prs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncOnlyExisting: true }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Status Pull Request Berhasil Diperbarui", {
          description: data.message || "Data status dan persetujuan PR berhasil disinkronkan dari Bitbucket Server.",
        });
      } else {
        toast.warning("Sinkronisasi Bitbucket Terkendala", {
          description: data.message || "Gagal mengambil data terbaru dari Bitbucket Server. Menampilkan data lokal.",
        });
      }
    } catch (err) {
      console.error("Gagal sinkronisasi Bitbucket saat refresh:", err);
      toast.error("Gagal terhubung ke server saat memperbarui data dari Bitbucket.");
    } finally {
      setRefreshKey((prev) => prev + 1);
      setIsRefreshing(false);
    }
  };

  const handleSyncSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PrQueueHeader
        onOpenSyncDialog={() => setIsSyncOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <PrDataTable onOpenSyncDialog={() => setIsSyncOpen(true)} refreshKey={refreshKey} />
      <SyncPrDialog open={isSyncOpen} onOpenChange={setIsSyncOpen} onSyncSuccess={handleSyncSuccess} />
    </div>
  );
}
