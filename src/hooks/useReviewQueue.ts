import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useReviewQueue(params?: {
  category?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ["review-queue", params],
    queryFn: () => apiClient.getPendingContent(params),
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: ["review-stats"],
    queryFn: () => apiClient.getStats(),
  });
}
