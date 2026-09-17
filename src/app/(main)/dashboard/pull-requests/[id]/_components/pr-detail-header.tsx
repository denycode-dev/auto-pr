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
          className="-ml-2 gap-1.5 text-muted-foreground text-xs hover:text-foreground"
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
          <Badge variant="outline" className="bg-muted px-2 py-0.5 font-mono text-xs">
            <GitPullRequest className="mr-1 size-3 text-primary" />
            PR #{pr.bitbucketPrId}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {pr.projectKey} / {pr.repositorySlug}
          </Badge>
          <span className="text-muted-foreground text-xs">
            Versi Bitbucket: <strong className="font-mono text-foreground">v{pr.bitbucketVersion}</strong>
          </span>
        </div>

        <h1 className="font-semibold text-foreground text-xl tracking-tight sm:text-2xl">{pr.title}</h1>

        {/* Metadata sub-row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-xs">
          <div className="flex items-center gap-1.5">
            <span>Dibuat oleh:</span>
            <strong className="font-medium text-foreground">{pr.authorName}</strong>
            <span className="font-mono text-muted-foreground/80">({pr.authorSlug})</span>
          </div>

          <span className="text-border">•</span>

          <div className="flex items-center gap-1 font-mono">
            <GitBranch className="size-3.5 text-primary" />
            <span className="font-medium text-foreground">{pr.sourceBranch}</span>
            <span>→</span>
            <span className="font-medium text-foreground">{pr.targetBranch}</span>
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
                <span className="font-medium text-foreground">{pr.filesChangedCount} berkas</span>
                <span className="font-semibold text-emerald-600">+{pr.additionsCount}</span>
                <span className="font-semibold text-rose-600">-{pr.deletionsCount}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
