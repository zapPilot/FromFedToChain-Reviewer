/**
 * React hook for polling GitHub Actions workflow status
 */

import { useQuery } from '@tanstack/react-query';
import type { Query } from '@tanstack/query-core';
import {
  githubClient,
  WorkflowName,
  WorkflowRun,
  WORKFLOWS,
} from '@/lib/github-client';
import { queryKeys } from '@/lib/query-keys';

export interface UseWorkflowStatusOptions {
  workflowFile: WorkflowName;
  contentId: string;
  enabled?: boolean;
  pollingInterval?: number; // in milliseconds
}

type WorkflowStatusQueryKey = readonly ['workflow-status', string, string];

interface WorkflowStatusResult {
  run: WorkflowRun | null;
  isRunning: boolean;
  isComplete: boolean;
  isSuccess: boolean;
  isFailed: boolean;
}

type WorkflowStatusQuery = Query<
  WorkflowStatusResult,
  Error,
  WorkflowStatusResult,
  WorkflowStatusQueryKey
>;

export function useWorkflowStatus({
  workflowFile,
  contentId,
  enabled = true,
  pollingInterval = 10000, // 10 seconds default
}: UseWorkflowStatusOptions) {
  const queryKey = queryKeys.workflowStatus(workflowFile, contentId);

  const query = useQuery<
    WorkflowStatusResult,
    Error,
    WorkflowStatusResult,
    WorkflowStatusQueryKey
  >({
    queryKey,
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
    refetchInterval: (queryInstance: WorkflowStatusQuery) => {
      const latest = queryInstance.state.data as
        | WorkflowStatusResult
        | undefined;
      if (!latest) return pollingInterval;
      return latest.isRunning ? pollingInterval : false;
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
  const unified = useWorkflowStatus({
    workflowFile: WORKFLOWS.UNIFIED,
    contentId,
    enabled,
    pollingInterval,
  });

  return {
    workflows: {
      unified,
      // Legacy mapping for compatibility if needed, using same status
      translate: unified,
      audio: unified,
      m3u8: unified,
      cloudflare: unified,
      contentUpload: unified,
    },
    isAnyRunning: unified.isRunning,
    allComplete: unified.isComplete,
    anyFailed: unified.isFailed,
  };
}
