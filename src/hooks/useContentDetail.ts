import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ReviewSubmitRequest } from "@/types/content";

export function useContentDetail(id: string) {
  return useQuery({
    queryKey: ["content-detail", id],
    queryFn: () => apiClient.getContentDetail(id),
  });
}

export function useReviewSubmit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewSubmitRequest }) =>
      apiClient.submitReview(id, data),
    onSuccess: () => {
      // Invalidate review queue and stats
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["review-stats"] });
    },
  });
}

export function useCategoryUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      apiClient.updateCategory(id, category as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-detail"] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
    },
  });
}
