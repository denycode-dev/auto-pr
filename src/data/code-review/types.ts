export type AIReviewStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type AIRecommendation = "RECOMMENDED_APPROVE" | "RECOMMENDED_NEEDS_WORK" | "RECOMMENDED_DECLINE";

export type SeniorDecision = "PENDING" | "APPROVED" | "NEEDS_WORK" | "DECLINED";

export type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type IssueCategory = "BUG" | "SECURITY" | "PERFORMANCE" | "SOP_VIOLATION" | "BEST_PRACTICE";

export interface SopCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  colorBadge?: string;
  sopCount?: number;
  totalSops?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Repository {
  id: string;
  projectKey: string;
  slug: string;
  name: string;
  isActive: boolean;
  defaultBranch?: string;
  openPrCount?: number;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewIssue {
  id: string;
  reviewRunId?: string;
  filePath: string;
  lineNumber: number;
  lineType: "ADDED" | "CONTEXT";
  severity: IssueSeverity;
  category: IssueCategory | string;
  title: string;
  description: string;
  suggestedFix?: string | null;
  bitbucketCommentId?: string | null;
  isPosted: boolean;
  isFalsePositive?: boolean;
  createdAt?: string;
}

export interface ReviewRun {
  id: string;
  pullRequestId: string;
  commitHash: string;
  summaryMarkdown: string;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  sopScore: number;
  rawLlmResponse?: Record<string, unknown>;
  createdAt: string;
}

export interface PullRequest {
  id: string;
  repositoryId: string;
  projectKey: string;
  repositorySlug: string;
  bitbucketPrId: number;
  title: string;
  authorName: string;
  authorSlug: string;
  authorAvatar?: string;
  sourceBranch: string;
  targetBranch: string;
  latestCommitHash: string;
  bitbucketVersion: number;
  prStatus: "OPEN" | "MERGED" | "DECLINED";
  aiReviewStatus: AIReviewStatus;
  aiRecommendation?: AIRecommendation;
  seniorDecision: SeniorDecision;
  seniorNotes?: string | null;
  decidedAt?: string;
  decidedBy?: string;
  cachedDiff?: string | null;
  cachedDiffHash?: string | null;
  filesChangedCount: number;
  additionsCount: number;
  deletionsCount: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  sopScore: number;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  issues?: ReviewIssue[];
  reviewRuns?: ReviewRun[];
}

export interface CodingSop {
  id: string;
  categoryId?: string;
  category?: SopCategory | string;
  categoryName?: string;
  categoryColor?: string;
  scope: "GLOBAL" | "REPOSITORY";
  repositoryId?: string | null;
  repositorySlug?: string;
  projectKey?: string;
  repository?: Repository | null;
  title: string;
  summary?: string | null;
  rulesMarkdown: string;
  isEnabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiffLine {
  type: "ADDED" | "DELETED" | "CONTEXT";
  oldLine?: number | null;
  newLine?: number | null;
  content: string;
  inlineIssues?: ReviewIssue[];
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface ParsedDiffFile {
  filePath: string;
  oldPath?: string;
  newPath?: string;
  status: "ADDED" | "MODIFIED" | "DELETED";
  additions: number;
  deletions: number;
  totalIssues: number;
  hunks: DiffHunk[];
  inlineIssues?: ReviewIssue[];
  diffText?: string;
}
