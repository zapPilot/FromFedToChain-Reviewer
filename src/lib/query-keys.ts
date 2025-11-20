export const queryKeys = {
  contentDetail: (id: string) => ['content-detail', id] as const,
  reviewQueue: (params?: Record<string, any>) =>
    ['review-queue', params] as const,
  reviewStats: () => ['review-stats'] as const,
  workflowStatus: (workflow: string, contentId: string) =>
    ['workflow-status', workflow, contentId] as const,
} as const;
