"use client";

import * as React from "react";

import { toast } from "sonner";

import type { Repository } from "@/data/code-review/types";

import { ConnectRepoDialog } from "./connect-repo-dialog";
import { RepoGrid } from "./repo-grid";
import { RepoHeader } from "./repo-header";

export function RepoManagerView() {
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [isConnectOpen, setIsConnectOpen] = React.useState(false);

  const fetchRepos = React.useCallback(async () => {
    try {
      const res = await fetch("/api/repositories");
      if (!res.ok) {
        setRepositories([]);
        return;
      }
      const text = await res.text();
      if (!text.trim()) {
        setRepositories([]);
        return;
      }
      const json = JSON.parse(text);
      if (json.success && Array.isArray(json.data)) {
        setRepositories(json.data);
      } else {
        setRepositories([]);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar repositori:", err);
      setRepositories([]);
    }
  }, []);

  React.useEffect(() => {
    void fetchRepos();
  }, [fetchRepos]);

  const handleToggleActive = async (id: string, active: boolean) => {
    setRepositories((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: active, updatedAt: new Date().toISOString() } : r)),
    );

    try {
      const res = await fetch(`/api/repositories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      if (res.ok) {
        toast.success(`Pemantauan repositori ${active ? "diaktifkan" : "dinonaktifkan"}`);
      }
    } catch (err) {
      console.warn("Could not sync repo status to DB:", err);
    }
  };

  const handleAddRepo = (newRepo: Repository) => {
    setRepositories((prev) => [newRepo, ...prev]);
  };

  return (
    <div className="flex flex-col gap-6">
      <RepoHeader onConnectNew={() => setIsConnectOpen(true)} />
      <RepoGrid
        repositories={repositories}
        onToggleActive={handleToggleActive}
        onConnectNew={() => setIsConnectOpen(true)}
      />
      <ConnectRepoDialog open={isConnectOpen} onOpenChange={setIsConnectOpen} onAddRepo={handleAddRepo} />
    </div>
  );
}
