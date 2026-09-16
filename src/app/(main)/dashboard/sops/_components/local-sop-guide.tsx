import { BookOpen, FileCode, GitFork, Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LocalSopGuide() {
  return (
    <Card className="border shadow-xs bg-muted/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GitFork className="size-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Panduan SOP Lokal Repositori (.review-rules.md)</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Selain Global SOP di atas, developer dapat menaruh aturan khusus per-proyek di root branch repositori.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
        <p>
          Sistem otomatis mengambil file <code className="font-mono bg-background px-1 py-0.5 rounded border text-foreground">.review-rules.md</code> via Bitbucket Server REST API saat analisis AI dijalankan.
        </p>

        <div className="rounded-md bg-background p-3 border font-mono text-[11px] text-foreground space-y-1">
          <div className="text-muted-foreground">// Contoh struktur .review-rules.md di root project:</div>
          <div># Rules Khusus Repositori Payment Service</div>
          <div>- Wajib validasi format IBAN dan Swift Code dengan regex internal.</div>
          <div>- Dilarang bypass circuit breaker ke vendor payment partner.</div>
          <div>- Gunakan error code dengan prefix `FIN-PAY-XXXX`.</div>
        </div>

        <div className="flex items-center gap-2 text-[11px] bg-primary/5 text-primary p-2.5 rounded border border-primary/10">
          <Info className="size-3.5 shrink-0" />
          <span>
            <strong>Aturan Presedensi (BR-05):</strong> Jika ada aturan lokal yang berbenturan dengan SOP Global, aturan lokal repository akan diutamakan oleh AI Reviewer.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
