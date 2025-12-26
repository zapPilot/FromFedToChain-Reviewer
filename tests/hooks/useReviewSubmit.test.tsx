import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReviewSubmit } from '@/hooks/useContentDetail';
import { apiClient } from '@/lib/api-client';
import { ReviewSubmitRequest } from '@/types/content';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    submitReview: vi.fn(),
  },
}));

describe('useReviewSubmit', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Mutation Execution', () => {
    it('submits review with correct payload', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.submitReview).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      const reviewData: ReviewSubmitRequest = {
        action: 'accept',
        feedback: 'Looks good!',
        newCategory: 'daily-news',
      };

      result.current.mutate({
        id: 'test-content-id',
        data: reviewData,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.submitReview).toHaveBeenCalledWith(
        'test-content-id',
        reviewData
      );
      expect(apiClient.submitReview).toHaveBeenCalledTimes(1);
    });

    it('returns loading state during mutation', async () => {
      let resolveMutation: any;
      vi.mocked(apiClient.submitReview).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMutation = resolve;
          })
      );

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        data: { action: 'accept', feedback: '', newCategory: 'daily-news' },
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      // Cleanup
      resolveMutation({ success: true });
    });

    it('calls onSuccess callback', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.submitReview).mockResolvedValue(mockResponse);
      const onSuccessMock = vi.fn();

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate(
        {
          id: 'test-id',
          data: { action: 'accept', feedback: '', newCategory: 'ethereum' },
        },
        {
          onSuccess: onSuccessMock,
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccessMock).toHaveBeenCalled();
      const callArgs = onSuccessMock.mock.calls[0];
      expect(callArgs[0]).toEqual(mockResponse);
      expect(callArgs[1]).toEqual({
        id: 'test-id',
        data: { action: 'accept', feedback: '', newCategory: 'ethereum' },
      });
    });

    it('submits accept review without feedback', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.submitReview).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'content-1',
        data: {
          action: 'accept',
          feedback: '',
          newCategory: 'macro',
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.submitReview).toHaveBeenCalledWith('content-1', {
        action: 'accept',
        feedback: '',
        newCategory: 'macro',
      });
    });

    it('submits reject review with feedback', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.submitReview).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'content-2',
        data: {
          action: 'reject',
          feedback: 'Content quality is too low',
          newCategory: 'daily-news',
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.submitReview).toHaveBeenCalledWith('content-2', {
        action: 'reject',
        feedback: 'Content quality is too low',
        newCategory: 'daily-news',
      });
    });

    it('includes category update in submission', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.submitReview).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'content-3',
        data: {
          action: 'accept',
          feedback: 'Great content!',
          newCategory: 'ai', // Changed category
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.submitReview).toHaveBeenCalledWith('content-3', {
        action: 'accept',
        feedback: 'Great content!',
        newCategory: 'ai',
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('invalidates review-queue cache after submit', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.submitReview).mockResolvedValue(mockResponse);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        data: { action: 'accept', feedback: '', newCategory: 'ethereum' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Check that invalidateQueries was called with review-queue
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['review-queue']),
        })
      );
    });

    it('invalidates review-stats cache after submit', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.submitReview).mockResolvedValue(mockResponse);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        data: { action: 'reject', feedback: 'Bad', newCategory: 'startup' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Check that invalidateQueries was called with review-stats
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['review-stats'],
      });
    });

    it('triggers refetch of affected queries', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.submitReview).mockResolvedValue(mockResponse);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        data: { action: 'accept', feedback: '', newCategory: 'defi' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Both caches should be invalidated
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['review-queue']),
        })
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['review-stats']),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('handles validation errors', async () => {
      const mockError = new Error('Validation error: feedback required');
      vi.mocked(apiClient.submitReview).mockRejectedValue(mockError);

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        data: {
          action: 'reject',
          feedback: '', // Missing required feedback for rejection
          newCategory: 'daily-news',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBeUndefined();
    });

    it('handles network errors', async () => {
      const mockError = new Error('Network request failed');
      vi.mocked(apiClient.submitReview).mockRejectedValue(mockError);

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        data: { action: 'accept', feedback: '', newCategory: 'ethereum' },
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
    });

    it('handles 404 not found errors', async () => {
      const mockError = new Error('Content not found');
      vi.mocked(apiClient.submitReview).mockRejectedValue(mockError);

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'non-existent-id',
        data: { action: 'accept', feedback: '', newCategory: 'macro' },
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
    });

    it('calls onError callback', async () => {
      const mockError = new Error('Submission failed');
      vi.mocked(apiClient.submitReview).mockRejectedValue(mockError);
      const onErrorMock = vi.fn();

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate(
        {
          id: 'test-id',
          data: { action: 'accept', feedback: '', newCategory: 'ai' },
        },
        {
          onError: onErrorMock,
        }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(onErrorMock).toHaveBeenCalled();
      const callArgs = onErrorMock.mock.calls[0];
      expect(callArgs[0]).toEqual(mockError);
      expect(callArgs[1]).toEqual({
        id: 'test-id',
        data: { action: 'accept', feedback: '', newCategory: 'ai' },
      });
    });

    it('does not invalidate cache on error', async () => {
      const mockError = new Error('Submission failed');
      vi.mocked(apiClient.submitReview).mockRejectedValue(mockError);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        data: { action: 'accept', feedback: '', newCategory: 'startup' },
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Cache should not be invalidated on error
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Mutation State', () => {
    it('resets state between mutations', async () => {
      vi.mocked(apiClient.submitReview)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useReviewSubmit(), { wrapper });

      // First mutation
      result.current.mutate({
        id: 'test-1',
        data: { action: 'accept', feedback: '', newCategory: 'ethereum' },
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Reset
      result.current.reset();
      await waitFor(() => {
        expect(result.current.status).toBe('idle');
      });
      expect(result.current.data).toBeUndefined();

      // Second mutation
      result.current.mutate({
        id: 'test-2',
        data: { action: 'reject', feedback: 'Bad', newCategory: 'defi' },
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.submitReview).toHaveBeenCalledTimes(2);
    });
  });
});
