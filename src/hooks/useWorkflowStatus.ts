/**
 * React hook for polling GitHub Actions workflow status
 */

import { useQuery } from '@tanstack/react-query';
import { githubClient, WorkflowName, WorkflowRun } from '@/lib/github-client';

export interface UseWorkflowStatusOptions {
  workflowFile: WorkflowName;
  contentId: string;
  enabled?: boolean;
  pollingInterval?: number; // in milliseconds
}

export function useWorkflowStatus({
  workflowFile,
  contentId,
  enabled = true,
  pollingInterval = 10000, // 10 seconds default
}: UseWorkflowStatusOptions) {
  const query = useQuery({
    queryKey: ['workflow-status', workflowFile, contentId],
    queryFn: async () => {
      const runs = await githubClient.getWorkflowRuns(workflowFile, 20);

      // Find the most recent run for this content
      // Note: In practice, you'd want to filter by workflow inputs or commit message
      const latestRun = runs.length > 0 ? runs[0] : null;

      return {
        run: latestRun,
        isRunning:
          latestRun?.status === 'in_progress' || latestRun?.status === 'queued',
        isComplete: latestRun?.status === 'completed',
        isSuccess: latestRun?.conclusion === 'success',
        isFailed: latestRun?.conclusion === 'failure',
      };
    },
    enabled: enabled && githubClient.isConfigured(),
    refetchInterval: (data) => {
      // Stop polling when workflow is complete
      if (!data) return pollingInterval;
      return data.isRunning ? pollingInterval : false;
    },
    retry: 3,
    retryDelay: 1000,
  });

  return {
    ...query,
    run: query.data?.run,
    isRunning: query.data?.isRunning ?? false,
    isComplete: query.data?.isComplete ?? false,
    isSuccess: query.data?.isSuccess ?? false,
    isFailed: query.data?.isFailed ?? false,
  };
}

export interface UseAllWorkflowsStatusOptions {
  contentId: string;
  enabled?: boolean;
  pollingInterval?: number;
}

/**
 * Hook to monitor status of all pipeline workflows
 */
export function useAllWorkflowsStatus({
  contentId,
  enabled = true,
  pollingInterval = 10000,
}: UseAllWorkflowsStatusOptions) {
  const translate = useWorkflowStatus({
    workflowFile: 'pipeline-translate.yml',
    contentId,
    enabled,
    pollingInterval,
  });

  const audio = useWorkflowStatus({
    workflowFile: 'pipeline-audio.yml',
    contentId,
    enabled,
    pollingInterval,
  });

  const m3u8 = useWorkflowStatus({
    workflowFile: 'pipeline-m3u8.yml',
    contentId,
    enabled,
    pollingInterval,
  });

  const cloudflare = useWorkflowStatus({
    workflowFile: 'pipeline-cloudflare.yml',
    contentId,
    enabled,
    pollingInterval,
  });

  const contentUpload = useWorkflowStatus({
    workflowFile: 'pipeline-content-upload.yml',
    contentId,
    enabled,
    pollingInterval,
  });

  const allWorkflows = {
    translate,
    audio,
    m3u8,
    cloudflare,
    contentUpload,
  };

  const isAnyRunning = Object.values(allWorkflows).some((w) => w.isRunning);
  const allComplete = Object.values(allWorkflows).every((w) => w.isComplete);
  const anyFailed = Object.values(allWorkflows).some((w) => w.isFailed);

  return {
    workflows: allWorkflows,
    isAnyRunning,
    allComplete,
    anyFailed,
  };
}
