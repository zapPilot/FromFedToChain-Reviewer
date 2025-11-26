import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import type {
  PaginatedResponse,
  ContentItem,
  ContentDetailResponse,
  ReviewStats,
} from '@/types/content';

// Mock global fetch
global.fetch = vi.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Response Unwrapping', () => {
    it('should unwrap standardized success response', async () => {
      const mockData = {
        content: [{ id: 'test-1' }],
        pagination: { page: 1, total: 1 },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockData,
        }),
      } as Response);

      const result = await apiClient.getPendingContent();

      expect(result).toEqual(mockData);
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('pagination');
    });

    it('should unwrap paginated response correctly', async () => {
      const mockPaginatedData: PaginatedResponse<ContentItem> = {
        content: [
          {
            id: 'test-1',
            status: 'draft',
            category: 'daily-news',
            date: '2025-01-01',
            language: 'zh-TW',
            title: 'Test',
            content: 'Content',
            references: [],
            audio_file: null,
            social_hook: null,
            feedback: { content_review: null },
            updated_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockPaginatedData,
        }),
      } as Response);

      const result = await apiClient.getPendingContent();

      expect(result.content).toHaveLength(1);
      expect(result.content[0].id).toBe('test-1');
      expect(result.pagination.page).toBe(1);
    });

    it('should unwrap content detail response correctly', async () => {
      const mockDetailData: ContentDetailResponse = {
        content: {
          id: 'test-1',
          status: 'draft',
          category: 'daily-news',
          date: '2025-01-01',
          language: 'zh-TW',
          title: 'Test',
          content: 'Content',
          references: [],
          audio_file: null,
          social_hook: null,
          feedback: { content_review: null },
          updated_at: new Date().toISOString(),
        },
        navigation: {
          previous: null,
          next: 'test-2',
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockDetailData,
        }),
      } as Response);

      const result = await apiClient.getContentDetail('test-1');

      expect(result.content.id).toBe('test-1');
      expect(result.navigation.next).toBe('test-2');
    });

    it('should unwrap stats response correctly', async () => {
      const mockStats: ReviewStats = {
        pending: 5,
        reviewed: 3,
        rejected: 2,
        total: 10,
        byCategory: {
          'daily-news': 3,
          ethereum: 2,
          macro: 1,
          startup: 2,
          ai: 1,
          defi: 1,
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockStats,
        }),
      } as Response);

      const result = await apiClient.getStats();

      expect(result.pending).toBe(5);
      expect(result.reviewed).toBe(3);
      expect(result.rejected).toBe(2);
      expect(result.total).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for standardized error response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Content not found',
          },
        }),
      } as Response);

      await expect(apiClient.getContentDetail('non-existent')).rejects.toThrow(
        'Content not found'
      );
    });

    it('should throw error for validation error response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Feedback is required',
            field: 'feedback',
          },
        }),
      } as Response);

      await expect(
        apiClient.submitReview('test-1', {
          action: 'reject',
          feedback: '',
        })
      ).rejects.toThrow('Feedback is required');
    });

    it('should handle HTTP error responses', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Internal server error',
        }),
      } as Response);

      await expect(apiClient.getPendingContent()).rejects.toThrow(
        'Internal server error'
      );
    });

    it('should handle non-JSON error responses', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        headers: new Headers(),
        redirected: false,
        statusText: 'Internal Server Error',
        type: 'default' as ResponseType,
        url: 'http://localhost/api/review/pending',
        clone: vi.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: vi.fn(),
        blob: vi.fn(),
        formData: vi.fn(),
        text: vi.fn(),
      } as unknown as Response);

      await expect(apiClient.getPendingContent()).rejects.toThrow();
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle non-standardized responses (direct data)', async () => {
      const mockData = {
        content: [{ id: 'test-1' }],
        pagination: { page: 1, total: 1 },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData, // Direct response without wrapper
      } as Response);

      const result = await apiClient.getPendingContent();

      expect(result).toEqual(mockData);
    });
  });

  describe('Method Tests', () => {
    it('getPendingContent should call correct endpoint with query params', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            content: [],
            pagination: { page: 1, total: 0, limit: 10, totalPages: 0 },
          },
        }),
      } as Response);

      await apiClient.getPendingContent({
        category: 'daily-news',
        page: 2,
        limit: 20,
        search: 'test',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/review/pending'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('category=daily-news');
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=20');
      expect(callUrl).toContain('search=test');
    });

    it('submitReview should send POST request with body', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            success: true,
            content: { id: 'test-1' } as ContentItem,
            message: 'Accepted',
          },
        }),
      } as Response);

      await apiClient.submitReview('test-1', {
        action: 'accept',
        feedback: 'Great',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/review/test-1/submit'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'accept',
            feedback: 'Great',
          }),
        })
      );
    });
  });
});
