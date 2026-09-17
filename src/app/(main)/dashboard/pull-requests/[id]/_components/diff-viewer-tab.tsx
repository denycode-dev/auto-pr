"use client";

import type { PullRequest } from "@/data/code-review/types";

import { CodeDiffViewer } from "./code-diff-viewer";

interface DiffViewerTabProps {
  pr: PullRequest;
}

export function DiffViewerTab({ pr }: DiffViewerTabProps) {
  return <CodeDiffViewer pr={pr} />;
}
