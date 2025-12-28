import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCategoryUpdate } from '@/hooks/useContentDetail';
import { apiClient } from '@/lib/api-client';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    updateCategory: vi.fn(),
  },
}));

describe('useCategoryUpdate', () => {
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
    it('updates category with correct payload', async () => {
      const mockResponse = {
        success: true,
        content: { id: 'test-id', category: 'ethereum' },
        message: 'Category updated successfully',
      };
      vi.mocked(apiClient.updateCategory).mockResolvedValue(
        mockResponse as any
      );

      const { result } = renderHook(() => useCategoryUpdate(), { wrapper });

      result.current.mutate({
        id: 'test-content-id',
        category: 'ethereum',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.updateCategory).toHaveBeenCalledWith(
        'test-content-id',
        'ethereum'
      );
      expect(apiClient.updateCategory).toHaveBeenCalledTimes(1);
    });

    it('returns loading state during mutation', async () => {
      let resolveMutation: any;
      vi.mocked(apiClient.updateCategory).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMutation = resolve;
          })
      );

      const { result } = renderHook(() => useCategoryUpdate(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        category: 'macro',
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      // Cleanup
      resolveMutation({
        success: true,
        content: { id: 'test-id', category: 'macro' },
        message: 'Category updated',
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('invalidates content-detail cache after update', async () => {
      const mockResponse = {
        success: true,
        content: { id: 'test-id', category: 'ai' },
        message: 'Category updated',
      };
      vi.mocked(apiClient.updateCategory).mockResolvedValue(
        mockResponse as any
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCategoryUpdate(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        category: 'ai',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Check that invalidateQueries was called with content-detail
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['content-detail'],
      });
    });

    it('invalidates review-queue cache after update', async () => {
      const mockResponse = {
        success: true,
        content: { id: 'test-id', category: 'defi' },
        message: 'Category updated',
      };
      vi.mocked(apiClient.updateCategory).mockResolvedValue(
        mockResponse as any
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCategoryUpdate(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        category: 'defi',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Check that invalidateQueries was called with review-queue
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['review-queue']),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('handles API errors', async () => {
      const mockError = new Error('Category update failed');
      vi.mocked(apiClient.updateCategory).mockRejectedValue(mockError);

      const { result } = renderHook(() => useCategoryUpdate(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        category: 'startup',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });

    it('does not invalidate cache on error', async () => {
      const mockError = new Error('Update failed');
      vi.mocked(apiClient.updateCategory).mockRejectedValue(mockError);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCategoryUpdate(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        category: 'daily-news',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('All Categories', () => {
    it.each([
      'daily-news',
      'ethereum',
      'macro',
      'startup',
      'ai',
      'defi',
    ] as const)('supports updating to %s category', async (category) => {
      const mockResponse = {
        success: true,
        content: { id: 'test-id', category },
        message: 'Category updated',
      };
      vi.mocked(apiClient.updateCategory).mockResolvedValue(
        mockResponse as any
      );

      const { result } = renderHook(() => useCategoryUpdate(), { wrapper });

      result.current.mutate({
        id: 'test-id',
        category,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.updateCategory).toHaveBeenCalledWith(
        'test-id',
        category
      );
    });
  });
});
