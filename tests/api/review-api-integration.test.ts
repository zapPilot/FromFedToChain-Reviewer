import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { ContentManager } from '@/lib/ContentManager';
import { TestUtils } from '../setup';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

// Mock Next.js API routes by directly importing and calling them
import { GET as getPending } from '@/app/api/review/pending/route';
import { GET as getContentDetail } from '@/app/api/review/[id]/route';
import { GET as getStats } from '@/app/api/review/stats/route';
import { NextRequest } from 'next/server';

/**
 * End-to-end integration tests that verify the full flow:
 * 1. API client calls methods
 * 2. Methods call fetch with correct URLs
 * 3. Fetch returns responses from API routes
 * 4. API routes return standardized format
 * 5. Client unwraps and returns correct data structure
 */
describe('Review API Integration - Client to Route', () => {
  let tempDir: string;
  let originalDir: string;
  let mockSupabase: any;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    originalDir = ContentManager.CONTENT_DIR;
    ContentManager.CONTENT_DIR = tempDir;

    // Mock Supabase
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase);

    // Mock fetch to call actual API route handlers
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalDir;
    await TestUtils.cleanupTempDir(tempDir);
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('GET /api/review/pending - Full Flow', () => {
    it('should fetch and unwrap paginated content correctly', async () => {
      // Setup: Create test content
      const content1 = TestUtils.createContent({
        id: 'integration-test-1',
        status: 'draft',
        category: 'daily-news',
      });
      const content2 = TestUtils.createContent({
        id: 'integration-test-2',
        status: 'draft',
        category: 'ethereum',
      });

      await TestUtils.writeContentFile(tempDir, content1);
      await TestUtils.writeContentFile(tempDir, content2);

      // Mock Supabase
      mockSupabase.eq.mockResolvedValue({ data: [], error: null });

      // Mock fetch to call actual route handler
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/api/review/pending')) {
          const request = new NextRequest(url);
          const response = await getPending(request);
          return {
            ok: response.ok,
            status: response.status,
            json: async () => await response.json(),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'default' as ResponseType,
            url: url.toString(),
            clone: vi.fn(),
            body: null,
            bodyUsed: false,
            arrayBuffer: vi.fn(),
            blob: vi.fn(),
            formData: vi.fn(),
            text: vi.fn(),
          } as unknown as Response;
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      // Execute: Call API client
      const result = await apiClient.getPendingContent();

      // Verify: Check unwrapped structure matches expected format
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBe(2);
      expect(result.content[0].id).toBe('integration-test-1');
      expect(result.content[1].id).toBe('integration-test-2');
      expect(result.pagination).toHaveProperty('total', 2);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 20);
    });

    it('should handle pagination parameters correctly', async () => {
      // Create multiple items
      const contents = [];
      for (let i = 1; i <= 5; i++) {
        contents.push(
          TestUtils.createContent({
            id: `pagination-test-${i}`,
            status: 'draft',
          })
        );
      }
      await TestUtils.seedContentSet(tempDir, contents);

      mockSupabase.eq.mockResolvedValue({ data: [], error: null });

      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/api/review/pending')) {
          const request = new NextRequest(url);
          const response = await getPending(request);
          return {
            ok: response.ok,
            status: response.status,
            json: async () => await response.json(),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'default' as ResponseType,
            url: url.toString(),
            clone: vi.fn(),
            body: null,
            bodyUsed: false,
            arrayBuffer: vi.fn(),
            blob: vi.fn(),
            formData: vi.fn(),
            text: vi.fn(),
          } as unknown as Response;
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await apiClient.getPendingContent({ page: 1, limit: 2 });

      expect(result.content).toHaveLength(2);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should filter out rejected content correctly', async () => {
      const content1 = TestUtils.createContent({
        id: 'accepted-test',
        status: 'draft',
      });
      const content2 = TestUtils.createContent({
        id: 'rejected-test',
        status: 'draft',
      });

      await TestUtils.writeContentFile(tempDir, content1);
      await TestUtils.writeContentFile(tempDir, content2);

      // Mock Supabase to return one rejected item
      mockSupabase.eq.mockResolvedValue({
        data: [{ id: 'rejected-test', review_status: 'rejected' }],
        error: null,
      });

      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/api/review/pending')) {
          const request = new NextRequest(url);
          const response = await getPending(request);
          return {
            ok: response.ok,
            status: response.status,
            json: async () => await response.json(),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'default' as ResponseType,
            url: url.toString(),
            clone: vi.fn(),
            body: null,
            bodyUsed: false,
            arrayBuffer: vi.fn(),
            blob: vi.fn(),
            formData: vi.fn(),
            text: vi.fn(),
          } as unknown as Response;
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await apiClient.getPendingContent();

      expect(result.content).toHaveLength(1);
      expect(result.content[0].id).toBe('accepted-test');
    });
  });

  describe('GET /api/review/[id] - Full Flow', () => {
    it('should fetch and unwrap content detail with navigation', async () => {
      const content1 = TestUtils.createContent({
        id: 'detail-test-1',
        status: 'draft',
        title: 'First Content',
      });
      const content2 = TestUtils.createContent({
        id: 'detail-test-2',
        status: 'draft',
        title: 'Second Content',
      });

      await TestUtils.writeContentFile(tempDir, content1);
      await TestUtils.writeContentFile(tempDir, content2);

      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (
          typeof url === 'string' &&
          url.includes('/api/review/detail-test-1')
        ) {
          const request = new NextRequest(url);
          const params = Promise.resolve({ id: 'detail-test-1' });
          const response = await getContentDetail(request, { params });
          return {
            ok: response.ok,
            status: response.status,
            json: async () => await response.json(),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'default' as ResponseType,
            url: url.toString(),
            clone: vi.fn(),
            body: null,
            bodyUsed: false,
            arrayBuffer: vi.fn(),
            blob: vi.fn(),
            formData: vi.fn(),
            text: vi.fn(),
          } as unknown as Response;
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await apiClient.getContentDetail('detail-test-1');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('navigation');
      expect(result.content.id).toBe('detail-test-1');
      expect(result.content.title).toBe('First Content');
      expect(result.navigation).toHaveProperty('previous');
      expect(result.navigation).toHaveProperty('next');
    });

    it('should throw error when content not found', async () => {
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (
          typeof url === 'string' &&
          url.includes('/api/review/non-existent')
        ) {
          const request = new NextRequest(url);
          const params = Promise.resolve({ id: 'non-existent' });
          const response = await getContentDetail(request, { params });
          return {
            ok: response.ok,
            status: response.status,
            json: async () => await response.json(),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'default' as ResponseType,
            url: url.toString(),
            clone: vi.fn(),
            body: null,
            bodyUsed: false,
            arrayBuffer: vi.fn(),
            blob: vi.fn(),
            formData: vi.fn(),
            text: vi.fn(),
          } as unknown as Response;
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      await expect(
        apiClient.getContentDetail('non-existent')
      ).rejects.toThrow();
    });
  });

  describe('GET /api/review/stats - Full Flow', () => {
    it('should fetch and unwrap review statistics correctly', async () => {
      const content1 = TestUtils.createContent({
        id: 'stats-test-1',
        status: 'draft',
        category: 'daily-news',
      });
      const content2 = TestUtils.createContent({
        id: 'stats-test-2',
        status: 'draft',
        category: 'ethereum',
      });

      await TestUtils.writeContentFile(tempDir, content1);
      await TestUtils.writeContentFile(tempDir, content2);

      // Mock Supabase status records
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: 'stats-test-1',
            review_status: 'accepted',
            category: 'daily-news',
          },
        ],
        error: null,
      });

      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/api/review/stats')) {
          const response = await getStats();
          return {
            ok: response.ok,
            status: response.status,
            json: async () => await response.json(),
            headers: new Headers(),
            redirected: false,
            statusText: 'OK',
            type: 'default' as ResponseType,
            url: url.toString(),
            clone: vi.fn(),
            body: null,
            bodyUsed: false,
            arrayBuffer: vi.fn(),
            blob: vi.fn(),
            formData: vi.fn(),
            text: vi.fn(),
          } as unknown as Response;
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const result = await apiClient.getStats();

      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('reviewed');
      expect(result).toHaveProperty('rejected');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byCategory');
      expect(result.total).toBe(2);
      expect(result.reviewed).toBe(1);
      expect(result.pending).toBe(1);
    });
  });

  describe('Response Structure Verification', () => {
    it('should maintain consistent response structure across all endpoints', async () => {
      const content = TestUtils.createContent({
        id: 'structure-test',
        status: 'draft',
      });
      await TestUtils.writeContentFile(tempDir, content);

      mockSupabase.eq.mockResolvedValue({ data: [], error: null });
      mockSupabase.select.mockResolvedValue({ data: [], error: null });

      // Test all endpoints return standardized format
      const endpoints = [
        {
          name: 'pending',
          handler: async () => {
            const request = new NextRequest(
              'http://localhost:3000/api/review/pending'
            );
            return await getPending(request);
          },
        },
        {
          name: 'detail',
          handler: async () => {
            const request = new NextRequest(
              'http://localhost:3000/api/review/structure-test'
            );
            const params = Promise.resolve({ id: 'structure-test' });
            return await getContentDetail(request, { params });
          },
        },
        {
          name: 'stats',
          handler: async () => {
            return await getStats();
          },
        },
      ];

      for (const endpoint of endpoints) {
        const response = await endpoint.handler();
        const body = await response.json();

        expect(body).toHaveProperty('success');
        expect(typeof body.success).toBe('boolean');
        if (body.success) {
          expect(body).toHaveProperty('data');
        } else {
          expect(body).toHaveProperty('error');
          expect(body.error).toHaveProperty('message');
        }
      }
    });
  });
});
