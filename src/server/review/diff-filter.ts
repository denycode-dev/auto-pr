import type { DiffHunk, DiffLine, ParsedDiffFile, ReviewIssue } from "@/data/code-review/types";

export interface FilteredFileDiff {
  filePath: string;
  isIgnored: boolean;
  ignoreReason?: string;
  diffContent: string;
  addedLines: { lineNumber: number; content: string }[];
}

export interface ParsedDiff {
  totalFiles: number;
  analyzableFiles: number;
  ignoredFiles: number;
  totalBytes: number;
  requiresChunking: boolean;
  files: FilteredFileDiff[];
}

export interface DiffStats {
  filesChanged: number;
  additions: number;
  deletions: number;
}

// BR-05: Patterns to ignore
const IGNORED_PATH_PATTERNS = [
  // Directories
  /(^|\/)(node_modules|dist|\.next|build|vendor|\.git|\.turbo|\.cache)\//i,
  // Lockfiles
  /(-lock\.yaml|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|go\.sum|composer\.lock)$/i,
  // Minified files
  /\.(min\.js|min\.css)$/i,
  // Media & Binary Assets
  /\.(png|jpe?g|gif|svg|ico|webp|woff|woff2|ttf|eot|mp4|webm|pdf|zip|tar|gz)$/i,
  // Map files
  /\.map$/i,
];

/**
 * Check whether a file path should be excluded from AI review (BR-05)
 */
export function shouldIgnoreFile(filePath: string): { ignore: boolean; reason?: string } {
  const normalized = filePath.replace(/\\/g, "/");

  for (const pattern of IGNORED_PATH_PATTERNS) {
    if (pattern.test(normalized)) {
      return { ignore: true, reason: `Matches ignore pattern: ${pattern.toString()}` };
    }
  }

  return { ignore: false };
}

/**
 * Calculate quick summary stats (+ additions, - deletions, files changed) from raw diff
 */
export function calculateDiffStats(rawDiff?: string | null): DiffStats {
  if (!rawDiff || typeof rawDiff !== "string") {
    return { filesChanged: 0, additions: 0, deletions: 0 };
  }

  const lines = rawDiff.split("\n");
  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      filesChanged++;
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }

  return {
    filesChanged: filesChanged > 0 ? filesChanged : rawDiff.trim().length > 0 ? 1 : 0,
    additions,
    deletions,
  };
}

/**
 * Parse a unified diff into per-file chunks and identify added lines for Bitbucket inline comments
 */
export function parseAndFilterDiff(rawDiff: string): ParsedDiff {
  if (!rawDiff || typeof rawDiff !== "string") {
    return {
      totalFiles: 0,
      analyzableFiles: 0,
      ignoredFiles: 0,
      totalBytes: 0,
      requiresChunking: false,
      files: [],
    };
  }

  const rawFileBlocks = rawDiff.split(/^diff --git /m).filter(Boolean);
  const files: FilteredFileDiff[] = [];

  for (const block of rawFileBlocks) {
    // Extract file path from block header: a/path/to/file b/path/to/file
    const headerMatch = block.match(/^a\/(.*?)\s+b\/(.*?)(?:\n|$)/m);
    let filePath = "";

    if (headerMatch) {
      filePath = headerMatch[2] || headerMatch[1];
    } else {
      const fallbackMatch = block.match(/\+\+\+\s+b\/(.*?)(?:\n|$)/m);
      filePath = fallbackMatch ? fallbackMatch[1] : "unknown-file";
    }

    const { ignore, reason } = shouldIgnoreFile(filePath);
    const addedLines: { lineNumber: number; content: string }[] = [];

    if (!ignore) {
      const lines = block.split("\n");
      let currentToLine = 0;

      for (const line of lines) {
        const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunkMatch) {
          currentToLine = parseInt(hunkMatch[1], 10) - 1;
          continue;
        }

        if (line.startsWith("+") && !line.startsWith("+++")) {
          currentToLine += 1;
          addedLines.push({
            lineNumber: currentToLine,
            content: line.substring(1),
          });
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          // Deletion doesn't advance target line
        } else {
          currentToLine += 1;
        }
      }
    }

    files.push({
      filePath,
      isIgnored: ignore,
      ignoreReason: reason,
      diffContent: `diff --git ${block}`,
      addedLines,
    });
  }

  const totalBytes = Buffer.byteLength(rawDiff, "utf8");
  const requiresChunking = totalBytes > 100 * 1024;
  const analyzableFiles = files.filter((f) => !f.isIgnored).length;
  const ignoredFiles = files.filter((f) => f.isIgnored).length;

  return {
    totalFiles: files.length,
    analyzableFiles,
    ignoredFiles,
    totalBytes,
    requiresChunking,
    files,
  };
}

/**
 * Parse unified git diff into rich file, hunk, and line structures for the ergonomic Code Diff Viewer (PRD 6.2)
 */
export function parseUnifiedDiffForViewer(
  rawDiff: string,
  issues: ReviewIssue[] = []
): ParsedDiffFile[] {
  if (!rawDiff || typeof rawDiff !== "string") {
    return [];
  }

  const rawFileBlocks = rawDiff.split(/^diff --git /m).filter(Boolean);
  const result: ParsedDiffFile[] = [];

  for (let blockIdx = 0; blockIdx < rawFileBlocks.length; blockIdx++) {
    const block = rawFileBlocks[blockIdx];
    const lines = block.split("\n");

    // Extract paths
    let filePath = "";
    let oldPath = "";
    let isNewFile = false;
    let isDeletedFile = false;

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (line.startsWith("new file mode")) {
        isNewFile = true;
      } else if (line.startsWith("deleted file mode")) {
        isDeletedFile = true;
      } else if (line.startsWith("--- a/")) {
        oldPath = line.replace("--- a/", "").trim();
      } else if (line.startsWith("+++ b/")) {
        filePath = line.replace("+++ b/", "").trim();
      }
    }

    if (!filePath) {
      const headerMatch = block.match(/^a\/(.*?)\s+b\/(.*?)(?:\n|$)/m);
      if (headerMatch) {
        filePath = headerMatch[2] || headerMatch[1];
        oldPath = headerMatch[1] || "";
      } else {
        // Use index to ensure uniqueness when path cannot be determined
        filePath = `unknown-file-${blockIdx}`;
      }
    }

    const status: "ADDED" | "MODIFIED" | "DELETED" = isNewFile
      ? "ADDED"
      : isDeletedFile
        ? "DELETED"
        : "MODIFIED";

    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldLineCursor = 0;
    let newLineCursor = 0;
    let fileAdditions = 0;
    let fileDeletions = 0;

    for (const line of lines) {
      // Check for hunk header: @@ -oldStart,oldLen +newStart,newLen @@
      const hunkHeaderMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
      if (hunkHeaderMatch) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        oldLineCursor = parseInt(hunkHeaderMatch[1], 10);
        newLineCursor = parseInt(hunkHeaderMatch[2], 10);
        currentHunk = {
          header: line.trim(),
          lines: [],
        };
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith("+") && !line.startsWith("+++")) {
        fileAdditions++;
        currentHunk.lines.push({
          type: "ADDED",
          oldLine: null,
          newLine: newLineCursor++,
          content: line.substring(1),
        });
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        fileDeletions++;
        currentHunk.lines.push({
          type: "DELETED",
          oldLine: oldLineCursor++,
          newLine: null,
          content: line.substring(1),
        });
      } else if (line.startsWith(" ") || line === "") {
        currentHunk.lines.push({
          type: "CONTEXT",
          oldLine: oldLineCursor++,
          newLine: newLineCursor++,
          content: line.startsWith(" ") ? line.substring(1) : line,
        });
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    // Match issues for this file
    const fileIssues = issues.filter(
      (iss) =>
        iss.filePath === filePath ||
        (oldPath && iss.filePath === oldPath) ||
        filePath.endsWith(iss.filePath) ||
        iss.filePath.endsWith(filePath)
    );

    result.push({
      filePath,
      oldPath: oldPath || filePath,
      status,
      additions: fileAdditions,
      deletions: fileDeletions,
      totalIssues: fileIssues.length,
      hunks,
      inlineIssues: fileIssues,
    });
  }

  return result;
}
