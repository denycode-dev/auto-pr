"use client";

import * as React from "react";
import { PrQueueHeader } from "./pr-queue-header";
import { PrDataTable } from "./pr-data-table";
import { SyncPrDialog } from "./sync-pr-dialog";

export function PrQueueView() {
  const [isSyncOpen, setIsSyncOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
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
      <PrDataTable
        onOpenSyncDialog={() => setIsSyncOpen(true)}
        refreshKey={refreshKey}
      />
      <SyncPrDialog
        open={isSyncOpen}
        onOpenChange={setIsSyncOpen}
        onSyncSuccess={handleSyncSuccess}
      />
    </div>
  );
}
