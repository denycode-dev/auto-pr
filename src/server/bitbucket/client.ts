import { getDynamicSystemConfig } from "@/server/db/settings";

export interface BitbucketAnchor {
  diffType: "EFFECTIVE";
  line: number;
  lineType: "ADDED" | "CONTEXT";
  fileType: "TO" | "FROM";
  path: string;
  srcPath: string;
}

export interface BitbucketCommentPayload {
  text: string;
  anchor?: BitbucketAnchor;
}

export interface BitbucketPullRequestResponse {
  id: number;
  version: number;
  title: string;
  state: "OPEN" | "MERGED" | "DECLINED";
  open: boolean;
  closed: boolean;
  fromRef: {
    id: string;
    latestCommit: string;
    repository: {
      slug: string;
      project: { key: string };
    };
  };
  toRef: {
    id: string;
    latestCommit: string;
  };
  author: {
    user: {
      name: string;
      displayName: string;
      emailAddress?: string;
    };
  };
}

export class BitbucketClient {
  /**
   * Get dynamic Bitbucket configuration from database / environment
   */
  async getConfig() {
    const dynamic = await getDynamicSystemConfig();
    let cleanToken = (dynamic.bitbucket.token || "").trim();
    if (cleanToken.startsWith("mBBDC-")) {
      cleanToken = cleanToken.substring(1);
    }

    return {
      baseUrl: dynamic.bitbucket.baseUrl,
      token: cleanToken,
      seniorUserSlug: dynamic.bitbucket.seniorUserSlug,
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "X-Atlassian-Token": "no-check",
        "Content-Type": "application/json",
        Accept: "application/json",
      } as HeadersInit,
    };
  }

  /**
   * Fetch list of pull requests from Bitbucket Server 8.19 REST API
   */
  async getPullRequests(
    projectKey: string,
    repositorySlug: string,
    state: "OPEN" | "MERGED" | "DECLINED" | "ALL" = "OPEN",
    limit = 50,
  ): Promise<BitbucketPullRequestResponse[]> {
    const { baseUrl, headers } = await this.getConfig();
    const url = `${baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests?state=${state}&limit=${limit}`;

    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Bitbucket Server API (${url}) merespons HTTP ${res.status}: ${errorText || res.statusText}`);
      }

      const json = await res.json();
      return json.values || [];
    } catch (err) {
      console.error(`[BitbucketClient] Error fetching pull requests for ${projectKey}/${repositorySlug}:`, err);
      throw err;
    }
  }

  /**
   * Fetch single PR details including current optimistic version
   */
  async getPullRequest(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: number,
  ): Promise<BitbucketPullRequestResponse | null> {
    const { baseUrl, headers } = await this.getConfig();
    const url = `${baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}`;
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        console.warn(`[BitbucketClient] GET PR ${pullRequestId} returned status ${res.status}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn(`[BitbucketClient] Network error getting PR ${pullRequestId}:`, err);
      return null;
    }
  }

  /**
   * Fetch raw diff for pull request
   */
  async getPullRequestDiff(projectKey: string, repositorySlug: string, pullRequestId: number): Promise<string> {
    const { baseUrl, headers } = await this.getConfig();
    const url = `${baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/diff`;
    try {
      const res = await fetch(url, {
        headers: {
          ...headers,
          Accept: "text/plain",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.warn(`[BitbucketClient] GET diff returned status ${res.status}`);
        return "";
      }
      return await res.text();
    } catch (err) {
      console.warn(`[BitbucketClient] Network error fetching diff for PR ${pullRequestId}:`, err);
      return "";
    }
  }

  /**
   * Fetch .review-rules.md file from source branch if present
   */
  async getRepoLocalSop(projectKey: string, repositorySlug: string, sourceBranch: string): Promise<string | null> {
    const { baseUrl, headers } = await this.getConfig();
    const cleanBranch = sourceBranch.replace(/^refs\/heads\//, "");
    const url = `${baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/raw/.review-rules.md?at=${encodeURIComponent(cleanBranch)}`;
    try {
      const res = await fetch(url, {
        headers: {
          ...headers,
          Accept: "text/plain",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        console.warn(`[BitbucketClient] GET .review-rules.md returned status ${res.status}`);
        return null;
      }
      return await res.text();
    } catch (err) {
      console.warn("[BitbucketClient] Could not fetch local .review-rules.md:", err);
      return null;
    }
  }

  /**
   * Post inline or general comment to pull request (BR-04)
   */
  async postComment(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: number,
    payload: BitbucketCommentPayload,
  ): Promise<{ id: number; text: string } | null> {
    const { baseUrl, headers } = await this.getConfig();
    const url = `${baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/comments`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.error(`[BitbucketClient] POST comment failed with status ${res.status}: ${errorText}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.error("[BitbucketClient] Network error posting comment:", err);
      return null;
    }
  }

  /**
   * Approve PR (BR-08)
   */
  async approvePullRequest(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: number,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const { baseUrl, headers } = await this.getConfig();
    const url = `${baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/approve`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        return {
          success: false,
          error: `Bitbucket API returned ${res.status}: ${errorText || res.statusText}`,
        };
      }
      const data = await res.json().catch(() => ({ approved: true }));
      return { success: true, data };
    } catch (err) {
      console.error("[BitbucketClient] Network error approving PR:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error approving PR",
      };
    }
  }

  /**
   * Set participant status to NEEDS_WORK (BR-08)
   */
  async setNeedsWork(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: number,
    seniorUserSlug?: string,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const { baseUrl, headers, seniorUserSlug: defaultSeniorSlug } = await this.getConfig();
    const userSlug = seniorUserSlug ?? defaultSeniorSlug ?? "senior.lead";
    const url = `${baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/participants/${userSlug}`;

    try {
      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "NEEDS_WORK" }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        return {
          success: false,
          error: `Bitbucket API returned ${res.status}: ${errorText || res.statusText}`,
        };
      }
      const data = await res.json().catch(() => ({ status: "NEEDS_WORK" }));
      return { success: true, data };
    } catch (err) {
      console.error("[BitbucketClient] Network error setting NEEDS_WORK:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error setting NEEDS_WORK",
      };
    }
  }

  /**
   * Decline Pull Request with optimistic concurrency version (BR-08)
   */
  async declinePullRequest(
    projectKey: string,
    repositorySlug: string,
    pullRequestId: number,
    version?: number,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const { baseUrl, headers } = await this.getConfig();
    let currentVersion = version;

    if (currentVersion === undefined) {
      const pr = await this.getPullRequest(projectKey, repositorySlug, pullRequestId);
      currentVersion = pr?.version ?? 0;
    }

    const url = `${baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/decline?version=${currentVersion}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ version: currentVersion }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        return {
          success: false,
          error: `Bitbucket API returned ${res.status}: ${errorText || res.statusText}`,
        };
      }
      const data = await res.json().catch(() => ({ state: "DECLINED" }));
      return { success: true, data };
    } catch (err) {
      console.error("[BitbucketClient] Network error declining PR:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error declining PR",
      };
    }
  }
}

export const bitbucketClient = new BitbucketClient();
