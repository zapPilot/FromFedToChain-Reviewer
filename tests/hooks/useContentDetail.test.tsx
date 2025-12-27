import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContentDetail } from '@/hooks/useContentDetail';
import { apiClient } from '@/lib/api-client';
import { TestUtils } from '../setup';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getContentDetail: vi.fn(),
  },
}));

describe('useContentDetail', () => {
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

  describe('Data Fetching', () => {
    it('fetches content by ID', async () => {
      const mockContent = TestUtils.createContent({ id: '2025-01-01-test' });
      const mockResponse = {
        content: mockContent,
        navigation: {
          previous: null,
          next: '2025-01-02-test',
        },
      };
      vi.mocked(apiClient.getContentDetail).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useContentDetail('2025-01-01-test'), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.getContentDetail).toHaveBeenCalledWith(
        '2025-01-01-test'
      );
      expect(apiClient.getContentDetail).toHaveBeenCalledTimes(1);
    });

    it('returns loading state initially', () => {
      vi.mocked(apiClient.getContentDetail).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useContentDetail('test-id'), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('returns data on success', async () => {
      const mockContent = TestUtils.createContent({
        id: '2025-01-01-bitcoin',
        title: 'Bitcoin Analysis',
      });
      const mockResponse = {
        content: mockContent,
        navigation: {
          previous: null,
          next: '2025-01-02-ethereum',
        },
      };
      vi.mocked(apiClient.getContentDetail).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useContentDetail('2025-01-01-bitcoin'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.content).toEqual(mockContent);
      expect(result.current.data?.navigation.next).toBe('2025-01-02-ethereum');
    });

    it('handles 404 errors', async () => {
      const mockError = new Error('Content not found');
      vi.mocked(apiClient.getContentDetail).mockRejectedValue(mockError);

      const { result } = renderHook(() => useContentDetail('non-existent'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBeUndefined();
    });

    it('handles network errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(apiClient.getContentDetail).mockRejectedValue(mockError);

      const { result } = renderHook(() => useContentDetail('test-id'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('Navigation Info', () => {
    it('returns navigation with previous and next IDs', async () => {
      const mockResponse = {
        content: TestUtils.createContent({ id: '2025-01-02-middle' }),
        navigation: {
          previous: '2025-01-01-first',
          next: '2025-01-03-last',
        },
      };
      vi.mocked(apiClient.getContentDetail).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useContentDetail('2025-01-02-middle'),
        {
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.navigation).toEqual({
        previous: '2025-01-01-first',
        next: '2025-01-03-last',
      });
    });

    it('returns null for previous when first item', async () => {
      const mockResponse = {
        content: TestUtils.createContent({ id: '2025-01-01-first' }),
        navigation: {
          previous: null,
          next: '2025-01-02-next',
        },
      };
      vi.mocked(apiClient.getContentDetail).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useContentDetail('2025-01-01-first'),
        {
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.navigation.previous).toBeNull();
      expect(result.current.data?.navigation.next).toBe('2025-01-02-next');
    });

    it('returns null for next when last item', async () => {
      const mockResponse = {
        content: TestUtils.createContent({ id: '2025-01-03-last' }),
        navigation: {
          previous: '2025-01-02-previous',
          next: null,
        },
      };
      vi.mocked(apiClient.getContentDetail).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useContentDetail('2025-01-03-last'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.navigation.previous).toBe(
        '2025-01-02-previous'
      );
      expect(result.current.data?.navigation.next).toBeNull();
    });

    it('returns both null when only one item', async () => {
      const mockResponse = {
        content: TestUtils.createContent({ id: '2025-01-01-only' }),
        navigation: {
          previous: null,
          next: null,
        },
      };
      vi.mocked(apiClient.getContentDetail).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useContentDetail('2025-01-01-only'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.navigation.previous).toBeNull();
      expect(result.current.data?.navigation.next).toBeNull();
    });
  });

  describe('Query Key Management', () => {
    it('uses content ID in query key', async () => {
      const mockResponse = {
        content: TestUtils.createContent({ id: 'test-id' }),
        navigation: { previous: null, next: null },
      };
      vi.mocked(apiClient.getContentDetail).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useContentDetail('test-id'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify the query was made
      expect(apiClient.getContentDetail).toHaveBeenCalledWith('test-id');
    });

    it('creates different cache entries for different IDs', async () => {
      const mockResponse1 = {
        content: TestUtils.createContent({ id: 'id-1' }),
        navigation: { previous: null, next: 'id-2' },
      };
      const mockResponse2 = {
        content: TestUtils.createContent({ id: 'id-2' }),
        navigation: { previous: 'id-1', next: null },
      };

      vi.mocked(apiClient.getContentDetail)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // Render with first ID
      const { result: result1 } = renderHook(() => useContentDetail('id-1'), {
        wrapper,
      });
      await waitFor(() => expect(result1.current.isSuccess).toBe(true));
      expect(result1.current.data?.content.id).toBe('id-1');

      // Render with different ID
      const { result: result2 } = renderHook(() => useContentDetail('id-2'), {
        wrapper,
      });
      await waitFor(() => expect(result2.current.isSuccess).toBe(true));
      expect(result2.current.data?.content.id).toBe('id-2');

      // Should have made 2 separate API calls (different cache keys)
      expect(apiClient.getContentDetail).toHaveBeenCalledTimes(2);
    });
  });
});
