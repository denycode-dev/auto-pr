import type { DiffHunk, ParsedDiffFile, ReviewIssue } from "@/data/code-review/types";

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
  // Coverage & Test artifacts
  /(^|\/)(coverage(\.out|\.txt|\.html)?|\.nyc_output|lcov\.info)$/i,
  /(^|\/)coverage$/i,
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
 * Normalizes git diff paths by removing surrounding quotes and git prefixes
 * like 'a/', 'b/', 'src://', 'dst://', 'i/', 'w/' (Bitbucket Server & Git standard)
 */
export function cleanGitPath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== "string") return "";
  let p = rawPath.trim();
  // Strip surrounding quotes
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1).trim();
  }
  // Strip Bitbucket Server and git prefixes: dst://, src://, a/, b/, i/, w/, c/
  p = p.replace(/^(?:dst:\/\/|src:\/\/|[abciw]\/)/i, "");
  return p.trim();
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
    const lines = block.split("\n");
    let filePath = "";
    let oldPath = "";

    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const line = lines[i];
      if (line.startsWith("--- ")) {
        const raw = line.substring(4).trim();
        if (raw !== "/dev/null") oldPath = cleanGitPath(raw);
      } else if (line.startsWith("+++ ")) {
        const raw = line.substring(4).trim();
        if (raw !== "/dev/null") filePath = cleanGitPath(raw);
      }
    }

    if (!filePath && oldPath) {
      filePath = oldPath;
    }

    if (!filePath) {
      const firstLine = lines[0] || "";
      const headerTokens = firstLine.match(/(?:(?:src:\/\/|dst:\/\/|[abciw]\/)?(?:"[^"]+"|\S+))/g);
      if (headerTokens && headerTokens.length >= 2) {
        filePath = cleanGitPath(headerTokens[1]);
      } else {
        const fallbackMatch = block.match(/(?:\+\+\+|---)\s+(\S+)/);
        filePath = fallbackMatch && fallbackMatch[1] !== "/dev/null" ? cleanGitPath(fallbackMatch[1]) : "unknown-file";
      }
    }

    const { ignore, reason } = shouldIgnoreFile(filePath);
    const addedLines: { lineNumber: number; content: string }[] = [];

    if (!ignore) {
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

    let finalIgnore = ignore;
    let finalReason = reason;
    if (!finalIgnore && addedLines.length === 0) {
      finalIgnore = true;
      finalReason = "No added or modified lines in diff";
    }

    files.push({
      filePath,
      isIgnored: finalIgnore,
      ignoreReason: finalReason,
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
 * Validates whether a given filePath and lineNumber corresponds to an actual added/modified line in the diff.
 * Returns false for unchanged context lines or files with no additions.
 */
export function isLineInChangedDiff(
  filePath: string,
  lineNumber: number,
  parsedDiff: ParsedDiff,
  tolerance = 1,
): boolean {
  if (!filePath || !lineNumber || !parsedDiff?.files) return false;

  const cleanTarget = cleanGitPath(filePath).toLowerCase();
  const file = parsedDiff.files.find((f) => {
    if (f.isIgnored || f.addedLines.length === 0) return false;
    const cleanF = cleanGitPath(f.filePath).toLowerCase();
    return cleanF === cleanTarget || cleanTarget.endsWith(cleanF) || cleanF.endsWith(cleanTarget);
  });

  if (!file) return false;

  return file.addedLines.some((al) => Math.abs(al.lineNumber - lineNumber) <= tolerance);
}

/**
 * Strips redundant file location headers (e.g., '📍 **Lokasi:** ...') from issue description.
 */
export function sanitizeIssueDescription(description?: string | null): string {
  if (!description) return "";
  return description.replace(/^[ \t]*📍[ \t]*\*{0,2}Lokasi:\*{0,2}[^\n]*(\r?\n)+/gim, "").trim();
}

const CATEGORY_GROUPS: Record<string, string> = {
  SOP_VIOLATION: "SOP",
  SOP: "SOP",
  CONVENTION: "SOP",
  STANDARD: "SOP",
  NAMING: "SOP",
  BEST_PRACTICE: "SOP",
  STYLE: "SOP",
  RULE: "SOP",
  SECURITY: "SECURITY",
  VULNERABILITY: "SECURITY",
  INJECTION: "SECURITY",
  AUTH: "SECURITY",
  BUG: "BUG",
  LOGIC: "BUG",
  ERROR: "BUG",
  DEFECT: "BUG",
  EXCEPTION: "BUG",
  PERFORMANCE: "PERFORMANCE",
  OPTIMIZATION: "PERFORMANCE",
  MEMORY: "PERFORMANCE",
  LEAK: "PERFORMANCE",
};

function getCategoryGroup(category?: string | null): string {
  if (!category) return "OTHER";
  const upper = category.toUpperCase().trim();
  return CATEGORY_GROUPS[upper] || upper;
}

function extractKeyTokens(text?: string | null): string[] {
  if (!text) return [];
  const backtickMatches = (text.match(/`([^`]+)`/g) || []).map((m) => m.replace(/`/g, "").toLowerCase().trim());
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return Array.from(new Set([...backtickMatches, ...words]));
}

/**
 * Checks whether an incoming candidate issue is a duplicate of any issue already recorded.
 * Considers file path, line proximity (exact or nearby), category compatibility groups,
 * and semantic token overlap (including backticked identifiers).
 */
export function isDuplicateIssue(
  candidate: {
    filePath: string;
    lineNumber: number;
    category: string;
    title: string;
    description?: string;
  },
  existingIssues: Array<{
    filePath: string;
    lineNumber: number;
    category: string;
    title: string;
    description?: string;
  }>,
): boolean {
  if (!existingIssues || existingIssues.length === 0) return false;

  const cleanCandidatePath = cleanGitPath(candidate.filePath).toLowerCase();
  const candGroup = getCategoryGroup(candidate.category);
  const candTokens = extractKeyTokens(`${candidate.title} ${candidate.description ?? ""}`);
  const candBackticks = (candidate.title.match(/`([^`]+)`/g) ?? []).map((m) =>
    m.replace(/`/g, "").toLowerCase().trim(),
  );

  return existingIssues.some((existing) => {
    const cleanExistingPath = cleanGitPath(existing.filePath).toLowerCase();
    const isSameFile =
      cleanCandidatePath === cleanExistingPath ||
      cleanCandidatePath.endsWith(cleanExistingPath) ||
      cleanExistingPath.endsWith(cleanCandidatePath);

    if (!isSameFile) return false;

    const lineDiff = Math.abs(candidate.lineNumber - existing.lineNumber);
    const existGroup = getCategoryGroup(existing.category);
    const isCompatibleCategory =
      candGroup === existGroup ||
      candidate.category.toUpperCase() === existing.category.toUpperCase() ||
      (candGroup === "SOP" && existGroup === "BUG") ||
      (candGroup === "BUG" && existGroup === "SOP");

    // 1. Same file + exact line number:
    // If on the exact same line, almost all AI models are reviewing the same construct.
    if (lineDiff === 0) {
      if (isCompatibleCategory) return true;

      // Even if categories differ, check if they share any token or title keyword
      const existTokens = extractKeyTokens(`${existing.title} ${existing.description ?? ""}`);
      const hasSharedToken = candTokens.some((t) => existTokens.includes(t));
      if (hasSharedToken) return true;

      // Check backticks match
      const existBackticks = (existing.title.match(/`([^`]+)`/g) ?? []).map((m) =>
        m.replace(/`/g, "").toLowerCase().trim(),
      );
      if (candBackticks.some((b) => existBackticks.includes(b))) return true;

      // Default for exact same line in same file: treat as duplicate
      return true;
    }

    // 2. Same file + nearby line (lineDiff <= 3):
    if (lineDiff <= 3) {
      const existTokens = extractKeyTokens(`${existing.title} ${existing.description ?? ""}`);
      const sharedCount = candTokens.filter((t) => existTokens.includes(t)).length;

      // Shared code token in backtick (e.g. `pekerja` or `photo_url`)
      const existBackticks = (existing.title.match(/`([^`]+)`/g) ?? []).map((m) =>
        m.replace(/`/g, "").toLowerCase().trim(),
      );
      const sharedBacktick = candBackticks.some((b) => existBackticks.includes(b));

      if (sharedBacktick) return true;
      if (isCompatibleCategory && sharedCount >= 1) return true;
      if (sharedCount >= 2) return true;
    }

    // 3. Exact normalized title match in the same file (even if line shifted up to 10 lines)
    if (lineDiff <= 10) {
      const normCandTitle = candidate.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normExistTitle = existing.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normCandTitle.length > 5 && normCandTitle === normExistTitle) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Deduplicates a list of issues across multiple review runs or reports.
 */
export function deduplicateIssues<
  T extends {
    filePath: string;
    lineNumber: number;
    category: string;
    title: string;
    description?: string;
  },
>(issues: T[]): T[] {
  if (issues.length === 0) return [];
  const result: T[] = [];
  for (const iss of issues) {
    const isDup = isDuplicateIssue(iss, result);
    if (!isDup) {
      result.push(iss);
    }
  }
  return result;
}

/**
 * Parse unified git diff into rich file, hunk, and line structures for the ergonomic Code Diff Viewer (PRD 6.2)
 */
export function parseUnifiedDiffForViewer(rawDiff: string, issues: ReviewIssue[] = []): ParsedDiffFile[] {
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

    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const line = lines[i];
      if (line.startsWith("new file mode")) {
        isNewFile = true;
      } else if (line.startsWith("deleted file mode")) {
        isDeletedFile = true;
      } else if (line.startsWith("--- ")) {
        const raw = line.substring(4).trim();
        if (raw !== "/dev/null") {
          oldPath = cleanGitPath(raw);
        }
      } else if (line.startsWith("+++ ")) {
        const raw = line.substring(4).trim();
        if (raw !== "/dev/null") {
          filePath = cleanGitPath(raw);
        }
      }
    }

    // For deleted file, target path is /dev/null, so filePath becomes oldPath
    if (!filePath && oldPath) {
      filePath = oldPath;
    }

    // If still not resolved from --- / +++, check header line
    if (!filePath) {
      const firstLine = lines[0] || "";
      const headerTokens = firstLine.match(/(?:(?:src:\/\/|dst:\/\/|[abciw]\/)?(?:"[^"]+"|\S+))/g);
      if (headerTokens && headerTokens.length >= 2) {
        oldPath = cleanGitPath(headerTokens[0]);
        filePath = cleanGitPath(headerTokens[1]);
      } else {
        const fallbackMatch = block.match(/(?:\+\+\+|---)\s+(\S+)/);
        if (fallbackMatch && fallbackMatch[1] !== "/dev/null") {
          filePath = cleanGitPath(fallbackMatch[1]);
        } else {
          filePath = `unknown-file-${blockIdx}`;
        }
      }
    }

    const status: "ADDED" | "MODIFIED" | "DELETED" = isNewFile ? "ADDED" : isDeletedFile ? "DELETED" : "MODIFIED";

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
        iss.filePath.endsWith(filePath),
    );

    // Attach inline issues to specific diff lines for anchored review comments
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        const matched = fileIssues.filter(
          (iss) =>
            (line.newLine !== null && line.newLine !== undefined && iss.lineNumber === line.newLine) ||
            (line.oldLine !== null && line.oldLine !== undefined && iss.lineNumber === line.oldLine),
        );
        if (matched.length > 0) {
          line.inlineIssues = matched;
        }
      }
    }

    result.push({
      filePath,
      oldPath: oldPath || filePath,
      status,
      additions: fileAdditions,
      deletions: fileDeletions,
      totalIssues: fileIssues.length,
      hunks,
      inlineIssues: fileIssues,
      diffText: formatBitbucketDiffForShiki(block, filePath, oldPath, hunks),
    });
  }

  return result;
}

/**
 * Normalizes Bitbucket Server diffs into standard Git Unified Diff format for Shiki rendering.
 * Converts 'src://' and 'dst://' to standard 'a/' and 'b/', ensures clean diff headers,
 * and reconstructs exact unified diff lines (+ for additions, - for deletions, ' ' for context).
 */
export function formatBitbucketDiffForShiki(
  rawBlock: string,
  filePath: string,
  oldPath?: string,
  hunks?: DiffHunk[],
): string {
  const cleanNew = cleanGitPath(filePath);
  const cleanOld = cleanGitPath(oldPath ?? filePath);

  if (hunks && hunks.length > 0) {
    const lines: string[] = [`diff --git a/${cleanOld} b/${cleanNew}`, `--- a/${cleanOld}`, `+++ b/${cleanNew}`];

    for (const hunk of hunks) {
      lines.push(hunk.header);
      for (const l of hunk.lines) {
        if (l.type === "ADDED") {
          lines.push(`+${l.content}`);
        } else if (l.type === "DELETED") {
          lines.push(`-${l.content}`);
        } else {
          lines.push(` ${l.content}`);
        }
      }
    }

    return lines.join("\n");
  }

  // Fallback if no hunks parsed
  let text = rawBlock.replace(/\r\n/g, "\n");
  text = text.replace(/src:\/\//g, "a/").replace(/dst:\/\//g, "b/");

  if (!text.startsWith("diff --git ")) {
    text = `diff --git a/${cleanOld} b/${cleanNew}\n` + text.replace(/^(?:a\/\S+|[^\n]+)\s+(?:b\/\S+|[^\n]+)\n?/, "");
  }

  text = text.replace(/^---\s+(?:src:\/\/|[abciw]\/)?([^\n]+)/m, `--- a/${cleanOld}`);
  text = text.replace(/^\+\+\+\s+(?:dst:\/\/|[abciw]\/)?([^\n]+)/m, `+++ b/${cleanNew}`);

  return text.trim();
}
