import Link from "next/link";
import { ArrowLeft, ExternalLink, FileCode2, GitBranch, GitCommit, GitPullRequest } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PullRequest } from "@/data/code-review/types";

interface PrDetailHeaderProps {
  pr: PullRequest;
}

export function PrDetailHeader({ pr }: PrDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb & Bitbucket Link */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 -ml-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard/pull-requests">
            <ArrowLeft className="size-3.5" />
            Kembali ke Antrean PR
          </Link>
        </Button>

        <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
          <a
            href={`https://bitbucket.bri.co.id/projects/${pr.projectKey}/repos/${pr.repositorySlug}/pull-requests/${pr.bitbucketPrId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka di Bitbucket Server
            <ExternalLink className="size-3" />
          </a>
        </Button>
      </div>

      {/* Main Title Row */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 bg-muted">
            <GitPullRequest className="size-3 mr-1 text-primary" />
            PR #{pr.bitbucketPrId}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {pr.projectKey} / {pr.repositorySlug}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Versi Bitbucket: <strong className="font-mono text-foreground">v{pr.bitbucketVersion}</strong>
          </span>
        </div>

        <h1 className="font-semibold text-xl tracking-tight sm:text-2xl text-foreground">
          {pr.title}
        </h1>

        {/* Metadata sub-row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Dibuat oleh:</span>
            <strong className="text-foreground font-medium">{pr.authorName}</strong>
            <span className="text-muted-foreground/80 font-mono">({pr.authorSlug})</span>
          </div>

          <span className="text-border">•</span>

          <div className="flex items-center gap-1 font-mono">
            <GitBranch className="size-3.5 text-primary" />
            <span className="text-foreground font-medium">{pr.sourceBranch}</span>
            <span>→</span>
            <span className="text-foreground font-medium">{pr.targetBranch}</span>
          </div>

          <span className="text-border">•</span>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            <GitCommit className="size-3.5" />
            <span>
              Commit: <strong className="text-foreground">{pr.latestCommitHash}</strong>
            </span>
          </div>

          {typeof pr.filesChangedCount === "number" && pr.filesChangedCount > 0 && (
            <>
              <span className="text-border">•</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <FileCode2 className="size-3.5 text-primary" />
                <span className="text-foreground font-medium">{pr.filesChangedCount} berkas</span>
                <span className="text-emerald-600 font-semibold">+{pr.additionsCount ?? 0}</span>
                <span className="text-rose-600 font-semibold">-{pr.deletionsCount ?? 0}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
