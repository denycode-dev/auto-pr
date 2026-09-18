"use client";

import { Filter, Layers } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DiffFilterCard() {
  return (
    <Card className="overflow-hidden border shadow-xs">
      <CardHeader className="border-b bg-muted/20 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-primary" />
          <CardTitle className="font-semibold text-base">
            Kebijakan Diff Filtering & Token Optimization (BR-02 & BR-10)
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Daftar berkas yang otomatis dikecualikan dari prompt AI untuk mencegah pemborosan token dan noise review.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-4 text-xs sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
            <span className="block font-semibold text-foreground">Package & Lockfiles:</span>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              *-lock.yaml, package-lock.json, yarn.lock, Cargo.lock, go.sum
            </p>
          </div>

          <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
            <span className="block font-semibold text-foreground">Minified & Generated:</span>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              *.min.js, *.min.css, *.map, dist/**, .next/**, vendor/**
            </p>
          </div>

          <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
            <span className="block font-semibold text-foreground">Asset Media & Font:</span>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              *.png, *.jpg, *.jpeg, *.svg, *.webp, *.woff, *.woff2, *.ico
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-primary/10 bg-primary/5 p-3.5">
          <Layers className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="font-semibold text-foreground">Batas Partisi Diff (BR-10):</strong> Jika diff melebihi
            30.000 token atau 100 KB, sistem secara otomatis membagi partisi per berkas (chunking) untuk menjaga
            stabilitas context window LLM.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
