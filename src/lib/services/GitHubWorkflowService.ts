import { Octokit } from '@octokit/rest';

export class GitHubWorkflowService {
  private static octokit = new Octokit({
    auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
  });

  private static owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;
  private static repo = process.env.NEXT_PUBLIC_GITHUB_REPO!;

  /**
   * Trigger a GitHub Actions workflow
   */
  static async triggerWorkflow(
    workflowId: string,
    inputs: Record<string, string>
  ) {
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
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      throw new Error(`Workflow trigger failed: ${error}`);
    }
  }

  /**
   * Get recent workflow runs for a specific workflow
   */
  static async getWorkflowRuns(workflowId: string, limit = 10) {
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
    const { data } = await this.octokit.rest.actions.getWorkflowRun({
      owner: this.owner,
      repo: this.repo,
      run_id: runId,
    });

    return data;
  }
}
