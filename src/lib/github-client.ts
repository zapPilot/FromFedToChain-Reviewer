/**
 * GitHub API Client for triggering workflows and fetching status
 * Used for GitHub Pages + GitHub Actions architecture
 */

import {
  WorkflowName,
  WORKFLOWS,
  WorkflowRun,
  TriggerWorkflowParams,
} from '@/types/github';

const GITHUB_API_BASE = 'https://api.github.com';

// GitHub repository configuration
const REPO_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'zapPilot';
const REPO_NAME =
  process.env.NEXT_PUBLIC_GITHUB_REPO || 'FromFedToChain-Reviewer';
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';

export {
  WORKFLOWS,
  type WorkflowName,
  type WorkflowRun,
  type TriggerWorkflowParams,
};

class GitHubClient {
  private baseUrl: string;
  private owner: string;
  private repo: string;
  private token: string;

  constructor() {
    this.baseUrl = GITHUB_API_BASE;
    this.owner = REPO_OWNER;
    this.repo = REPO_NAME;
    this.token = GITHUB_TOKEN;

    if (!this.token) {
      console.warn(
        'GitHub token not set. Set NEXT_PUBLIC_GITHUB_TOKEN environment variable.'
      );
    }
  }

  /**
   * Make authenticated request to GitHub API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/vnd.github+json');
    headers.set('X-GitHub-Api-Version', '2022-11-28');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(
        `GitHub API error: ${error.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Trigger a GitHub Actions workflow
   */
  async triggerWorkflow(
    workflowFile: WorkflowName,
    inputs: TriggerWorkflowParams
  ): Promise<void> {
    const endpoint = `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowFile}/dispatches`;

    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        ref: 'main', // or 'master' depending on your default branch
        inputs: {
          contentId: inputs.contentId,
          language: inputs.language || '',
          category: inputs.category || '',
          start_stage: inputs.start_stage || '',
        },
      }),
    });
  }

  /**
   * Get recent workflow runs for a specific workflow
   */
  async getWorkflowRuns(
    workflowFile: WorkflowName,
    limit: number = 10
  ): Promise<WorkflowRun[]> {
    const endpoint = `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowFile}/runs?per_page=${limit}`;

    const data = await this.request<{ workflow_runs: WorkflowRun[] }>(endpoint);
    return data.workflow_runs;
  }

  /**
   * Get a specific workflow run by ID
   */
  async getWorkflowRun(runId: number): Promise<WorkflowRun> {
    const endpoint = `/repos/${this.owner}/${this.repo}/actions/runs/${runId}`;
    return this.request<WorkflowRun>(endpoint);
  }

  /**
   * Get workflow run logs
   */
  async getWorkflowLogs(runId: number): Promise<string> {
    const endpoint = `/repos/${this.owner}/${this.repo}/actions/runs/${runId}/logs`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    // GitHub returns a zip file of logs, we'll get the redirect URL
    // For simplicity, return the download URL
    return response.url;
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflowRun(runId: number): Promise<void> {
    const endpoint = `/repos/${this.owner}/${this.repo}/actions/runs/${runId}/cancel`;

    await this.request(endpoint, {
      method: 'POST',
    });
  }

  /**
   * Get the latest workflow run for a specific content ID
   * Searches through recent runs to find one matching the contentId
   */
  async getLatestRunForContent(
    workflowFile: WorkflowName,
    contentId: string
  ): Promise<WorkflowRun | null> {
    const runs = await this.getWorkflowRuns(workflowFile, 50);

    // Find run that matches this content ID
    // We'll need to check the workflow inputs or name
    // For now, return the most recent run
    return runs.length > 0 ? runs[0] : null;
  }

  /**
   * Read a file from the repository
   * Useful for reading content JSON files directly from GitHub
   */
  async readFileContent(
    path: string,
    branch: string = 'main'
  ): Promise<string> {
    const endpoint = `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${branch}`;

    const data = await this.request<{ content: string; encoding: string }>(
      endpoint
    );

    if (data.encoding === 'base64') {
      return atob(data.content);
    }

    return data.content;
  }

  /**
   * List files in a directory
   */
  async listDirectory(
    path: string,
    branch: string = 'main'
  ): Promise<Array<{ name: string; path: string; type: 'file' | 'dir' }>> {
    const endpoint = `/repos/${this.owner}/${this.repo}/contents/${path}?ref=${branch}`;

    const data =
      await this.request<Array<{ name: string; path: string; type: string }>>(
        endpoint
      );

    return data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === 'dir' ? 'dir' : 'file',
    }));
  }

  /**
   * Trigger the full pipeline for a content ID
   * Uses the unified workflow starting from the translate stage
   */
  async triggerFullPipeline(params: TriggerWorkflowParams): Promise<void> {
    // Trigger unified workflow starting from translate stage
    // All subsequent stages (audio → m3u8 → cloudflare → content-upload) run automatically
    await this.triggerWorkflow(WORKFLOWS.UNIFIED, {
      ...params,
      start_stage: 'translate',
    });
  }

  /**
   * Check if GitHub token is configured
   */
  isConfigured(): boolean {
    return !!this.token && this.owner !== 'YOUR_GITHUB_USERNAME';
  }
}

// Export singleton instance
export const githubClient = new GitHubClient();

// Export class for testing
export { GitHubClient };
