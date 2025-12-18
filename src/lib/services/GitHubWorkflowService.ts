import { Octokit } from '@octokit/rest';

export class GitHubWorkflowService {
  private static octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  private static owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;
  private static repo = process.env.NEXT_PUBLIC_GITHUB_REPO!;

  /**
   * Validate that all required configuration is present
   */
  private static validateConfig() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error(
        'GITHUB_TOKEN is not set. Please add it to your .env.local file.'
      );
    }
    if (!this.owner) {
      throw new Error(
        'NEXT_PUBLIC_GITHUB_OWNER is not set. Please add it to your .env.local file.'
      );
    }
    if (!this.repo) {
      throw new Error(
        'NEXT_PUBLIC_GITHUB_REPO is not set. Please add it to your .env.local file.'
      );
    }
  }

  /**
   * Trigger a GitHub Actions workflow
   */
  static async triggerWorkflow(
    workflowId: string,
    inputs: Record<string, string>
  ) {
    this.validateConfig();
    console.log(`🚀 Triggering workflow: ${workflowId}`, inputs);

    try {
      await this.octokit.rest.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflowId,
        ref: 'main',
        inputs,
      });

      return {
        success: true,
        workflowTriggered: true,
        message: `Workflow ${workflowId} triggered successfully`,
      };
    } catch (error: any) {
      console.error('Failed to trigger workflow:', error);

      // Enhanced error messages for common failure cases
      const errorMessage = error.message || String(error);

      if (error.status === 404 || errorMessage.includes('Not Found')) {
        throw new Error(
          `Workflow '${workflowId}' not found. Ensure the workflow file exists on the 'main' branch and has been committed and pushed to GitHub.`
        );
      }

      if (error.status === 401 || errorMessage.includes('Bad credentials')) {
        throw new Error(
          `GitHub authentication failed. Check GITHUB_TOKEN configuration in .env.local`
        );
      }

      if (error.status === 403) {
        throw new Error(
          `GitHub API rate limit exceeded or insufficient permissions. Check your token permissions.`
        );
      }

      if (error.status === 422) {
        throw new Error(
          `Invalid workflow inputs. Check that all required workflow inputs are provided: ${errorMessage}`
        );
      }

      throw new Error(`Workflow trigger failed: ${errorMessage}`);
    }
  }

  /**
   * Get recent workflow runs for a specific workflow
   */
  static async getWorkflowRuns(workflowId: string, limit = 10) {
    this.validateConfig();
    const { data } = await this.octokit.rest.actions.listWorkflowRuns({
      owner: this.owner,
      repo: this.repo,
      workflow_id: workflowId,
      per_page: limit,
    });

    return data.workflow_runs;
  }

  /**
   * Get workflow run by ID
   */
  static async getWorkflowRun(runId: number) {
    this.validateConfig();
    const { data } = await this.octokit.rest.actions.getWorkflowRun({
      owner: this.owner,
      repo: this.repo,
      run_id: runId,
    });

    return data;
  }
}
