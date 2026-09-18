"use client";

import * as React from "react";

import { Check, Copy, FileCode } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ShikiCodeViewProps {
  code: string;
  lang?: string;
  theme?: "github-dark" | "github-light" | "auto";
  className?: string;
  title?: string;
  maxHeight?: string;
  headerRight?: React.ReactNode;
}

const htmlCache = new Map<string, string>();

export function ShikiCodeView({
  code,
  lang = "typescript",
  theme = "auto",
  className = "",
  title,
  maxHeight,
  headerRight,
}: ShikiCodeViewProps) {
  const cacheKey = `${lang}:${theme}:${code}`;
  const [highlightedHtml, setHighlightedHtml] = React.useState<string | null>(() => {
    return htmlCache.get(cacheKey) ?? null;
  });
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!code) return;

    const cachedHtml = htmlCache.get(cacheKey);
    if (cachedHtml) {
      setHighlightedHtml(cachedHtml);
      return;
    }

    let isMounted = true;
    fetch("/api/highlight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lang, theme }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.html) {
          htmlCache.set(cacheKey, data.html);
          setHighlightedHtml(data.html);
        }
      })
      .catch((err) => {
        console.warn("[ShikiCodeView] Failed to highlight code:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [code, lang, theme, cacheKey]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Kode berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group relative rounded-lg border border-border overflow-hidden bg-card text-card-foreground shadow-xs transition-colors ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/60 dark:bg-muted/40 text-muted-foreground text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[11px] min-w-0">
          <FileCode className="size-3.5 text-muted-foreground shrink-0" />
          <span className="truncate font-medium text-foreground">{title ?? lang}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 gap-1 transition-colors"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>Salin</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Code Area */}
      <div
        className="overflow-x-auto p-3 text-xs font-mono leading-relaxed bg-zinc-50/70 dark:bg-zinc-950 text-foreground"
        style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
      >
        {highlightedHtml ? (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is trusted syntax-highlighted HTML
          <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        ) : (
          <pre className="text-foreground whitespace-pre">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
