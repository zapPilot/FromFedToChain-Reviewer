import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useReviewQueue(params?: {
  category?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.reviewQueue(params),
    queryFn: () => apiClient.getPendingContent(params),
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: queryKeys.reviewStats(),
    queryFn: () => apiClient.getStats(),
  });
}
