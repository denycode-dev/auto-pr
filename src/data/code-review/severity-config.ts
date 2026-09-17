import type * as React from "react";

import { AlertCircle, AlertTriangle, Info, ShieldAlert, Sparkles } from "lucide-react";

import type { IssueSeverity } from "./types";

export interface SeverityConfigItem {
  id: IssueSeverity;
  label: string;
  badgeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  cardBorderClass: string;
  cardBgClass: string;
  headerBgClass: string;
  accentColor: string;
  dotColor: string;
  description: string;
}

export const SEVERITY_CONFIG: Record<IssueSeverity, SeverityConfigItem> = {
  CRITICAL: {
    id: "CRITICAL",
    label: "Kritis (Critical)",
    badgeLabel: "CRITICAL",
    icon: ShieldAlert,
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold",
    cardBorderClass: "border-rose-500/40",
    cardBgClass: "bg-rose-500/[0.03] dark:bg-rose-950/15",
    headerBgClass: "bg-rose-500/[0.08] dark:bg-rose-950/30",
    accentColor: "text-rose-600 dark:text-rose-400",
    dotColor: "bg-rose-500",
    description: "Celah keamanan fatal, kebocoran rahasia, atau bug yang dapat merusak integritas sistem.",
  },
  HIGH: {
    id: "HIGH",
    label: "Tinggi (High)",
    badgeLabel: "HIGH",
    icon: AlertTriangle,
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 font-semibold",
    cardBorderClass: "border-orange-500/40",
    cardBgClass: "bg-orange-500/[0.03] dark:bg-orange-950/15",
    headerBgClass: "bg-orange-500/[0.08] dark:bg-orange-950/30",
    accentColor: "text-orange-600 dark:text-orange-400",
    dotColor: "bg-orange-500",
    description: "Unhandled error, kegagalan logika kritis, atau risiko downtime pada produksi.",
  },
  MEDIUM: {
    id: "MEDIUM",
    label: "Sedang (Medium)",
    badgeLabel: "MEDIUM",
    icon: AlertCircle,
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold",
    cardBorderClass: "border-amber-500/40",
    cardBgClass: "bg-amber-500/[0.03] dark:bg-amber-950/15",
    headerBgClass: "bg-amber-500/[0.08] dark:bg-amber-950/30",
    accentColor: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
    description: "Pelanggaran SOP arsitektur, query kurang efisien, atau inkonsistensi struktur data.",
  },
  LOW: {
    id: "LOW",
    label: "Rendah (Low)",
    badgeLabel: "LOW",
    icon: Info,
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 font-semibold",
    cardBorderClass: "border-sky-500/40",
    cardBgClass: "bg-sky-500/[0.03] dark:bg-sky-950/15",
    headerBgClass: "bg-sky-500/[0.08] dark:bg-sky-950/30",
    accentColor: "text-sky-600 dark:text-sky-400",
    dotColor: "bg-sky-500",
    description: "Saran best practice, refactor minor, atau optimasi penulisan kode.",
  },
  INFO: {
    id: "INFO",
    label: "Informasi (Info)",
    badgeLabel: "INFO",
    icon: Sparkles,
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 font-semibold",
    cardBorderClass: "border-indigo-500/40",
    cardBgClass: "bg-indigo-500/[0.03] dark:bg-indigo-950/15",
    headerBgClass: "bg-indigo-500/[0.08] dark:bg-indigo-950/30",
    accentColor: "text-indigo-600 dark:text-indigo-400",
    dotColor: "bg-indigo-500",
    description: "Catatan informasi gaya penulisan atau dokumentasi kode.",
  },
};

export function getSeverityConfig(severity: string): SeverityConfigItem {
  const normalized = (severity || "").toUpperCase() as IssueSeverity;
  return SEVERITY_CONFIG[normalized] || SEVERITY_CONFIG.INFO;
}

export function detectLanguageFromPath(filePath?: string): string {
  if (!filePath) return "typescript";
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "go":
      return "go";
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "py":
      return "python";
    case "sql":
      return "sql";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "sh":
    case "bash":
      return "bash";
    case "yaml":
    case "yml":
      return "yaml";
    case "md":
      return "markdown";
    case "java":
      return "java";
    case "rs":
      return "rust";
    default:
      return "typescript";
  }
}
