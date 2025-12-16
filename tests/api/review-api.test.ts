import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getPending } from '@/app/api/review/pending/route';
import { GET as getContentDetail } from '@/app/api/review/[id]/route';
import { GET as getStats } from '@/app/api/review/stats/route';
import { POST as submitReview } from '@/app/api/review/[id]/submit/route';
import { ContentManager } from '@/lib/ContentManager';
import { TestUtils } from '../setup';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ContentItem } from '@/types/content';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe('Review API Routes', () => {
  let tempDir: string;
  let originalDir: string;
  let mockSupabase: any;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    originalDir = ContentManager.CONTENT_DIR;
    ContentManager.CONTENT_DIR = tempDir;

    // Mock Supabase admin client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase);
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalDir;
    await TestUtils.cleanupTempDir(tempDir);
    vi.clearAllMocks();
  });

  describe('GET /api/review/pending', () => {
    it('should return standardized response format with paginated content', async () => {
      // Create test content
      const content1 = TestUtils.createContent({
        id: 'test-1',
        status: 'draft',
        category: 'daily-news',
      });
      const content2 = TestUtils.createContent({
        id: 'test-2',
        status: 'draft',
        category: 'ethereum',
      });

      await TestUtils.writeContentFile(tempDir, content1);
      await TestUtils.writeContentFile(tempDir, content2);

      // Mock Supabase to return no rejected content
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/review/pending'
      );
      const response = await getPending(request);
      const body = await response.json();

      // Verify standardized response structure
      expect(response.status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('content');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray(body.data.content)).toBe(true);
      expect(body.data.pagination).toHaveProperty('total');
      expect(body.data.pagination).toHaveProperty('page');
      expect(body.data.pagination).toHaveProperty('limit');
      expect(body.data.pagination).toHaveProperty('totalPages');
    });

    it('should filter out rejected content from Supabase', async () => {
      const content1 = TestUtils.createContent({
        id: 'test-1',
        status: 'draft',
      });
      const content2 = TestUtils.createContent({
        id: 'test-2',
        status: 'draft',
        feedback: {
          content_review: {
            status: 'rejected',
            score: 2,
            reviewer: 'test-reviewer',
            timestamp: new Date().toISOString(),
            comments: 'Test rejection',
          },
        },
      });

      await TestUtils.writeContentFile(tempDir, content1);
      await TestUtils.writeContentFile(tempDir, content2);

      // Mock ContentManager.list to return both items
      // After migration 005, all review data is in content.feedback, no content_status query
      mockSupabase.order.mockResolvedValue({
        data: [content1, content2],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/review/pending'
      );
      const response = await getPending(request);
      const body = await response.json();

      expect(body.data.content).toHaveLength(1);
      expect(body.data.content[0].id).toBe('test-1');
    });

    it('should support pagination parameters', async () => {
      // Create multiple content items
      const contents: ContentItem[] = [];
      for (let i = 1; i <= 5; i++) {
        contents.push(
          TestUtils.createContent({
            id: `test-${i}`,
            status: 'draft',
          })
        );
      }
      await TestUtils.seedContentSet(tempDir, contents);

      mockSupabase.order.mockResolvedValue({ data: contents, error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/review/pending?page=1&limit=2'
      );
      const response = await getPending(request);
      const body = await response.json();

      expect(body.data.content).toHaveLength(2);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(2);
      expect(body.data.pagination.total).toBe(5);
      expect(body.data.pagination.totalPages).toBe(3);
    });

    it('should support category filtering', async () => {
      const content1 = TestUtils.createContent({
        id: 'test-1',
        category: 'daily-news',
        status: 'draft',
      });
      const content2 = TestUtils.createContent({
        id: 'test-2',
        category: 'ethereum',
        status: 'draft',
      });

      await TestUtils.writeContentFile(tempDir, content1);
      await TestUtils.writeContentFile(tempDir, content2);

      mockSupabase.order.mockResolvedValue({
        data: [content1, content2],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/review/pending?category=daily-news'
      );
      const response = await getPending(request);
      const body = await response.json();

      expect(body.data.content).toHaveLength(1);
      expect(body.data.content[0].id).toBe('test-1');
    });

    it('should return error response format on failure', async () => {
      // Mock ContentManager to throw error
      const originalList = ContentManager.list;
      ContentManager.list = vi
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost:3000/api/review/pending'
      );
      const response = await getPending(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');

      // Restore original method
      ContentManager.list = originalList;
    });
  });

  describe('GET /api/review/[id]', () => {
    it('should return standardized response format with content and navigation', async () => {
      const content = TestUtils.createContent({
        id: 'test-1',
        status: 'draft',
      });
      await TestUtils.writeContentFile(tempDir, content);

      // Mock Supabase to return the test content
      mockSupabase.single.mockResolvedValue({ data: content, error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/review/test-1'
      );
      const params = Promise.resolve({ id: 'test-1' });
      const response = await getContentDetail(request, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('content');
      expect(body.data).toHaveProperty('navigation');
      expect(body.data.content.id).toBe('test-1');
      expect(body.data.navigation).toHaveProperty('previous');
      expect(body.data.navigation).toHaveProperty('next');
    });

    it('should return 404 error format when content not found', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/review/non-existent'
      );
      const params = Promise.resolve({ id: 'non-existent' });
      const response = await getContentDetail(request, { params });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(body.error).toHaveProperty('message');
    });
  });

  describe('GET /api/review/stats', () => {
    it('should return standardized response format with review statistics', async () => {
      const content1 = TestUtils.createContent({
        id: 'test-1',
        status: 'draft',
        category: 'daily-news',
      });
      const content2 = TestUtils.createContent({
        id: 'test-2',
        status: 'draft',
        category: 'ethereum',
      });

      await TestUtils.writeContentFile(tempDir, content1);
      await TestUtils.writeContentFile(tempDir, content2);

      // Mock Supabase status records
      mockSupabase.order.mockResolvedValue({
        data: [
          { id: 'test-1', review_status: 'accepted', category: 'daily-news' },
        ],
        error: null,
      });

      const response = await getStats();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('pending');
      expect(body.data).toHaveProperty('reviewed');
      expect(body.data).toHaveProperty('rejected');
      expect(body.data).toHaveProperty('total');
      expect(body.data).toHaveProperty('byCategory');
    });
  });

  describe('POST /api/review/[id]/submit', () => {
    it('should return standardized response format when accepting content', async () => {
      const content = TestUtils.createContent({
        id: 'test-1',
        status: 'draft',
      });
      await TestUtils.writeContentFile(tempDir, content);

      // Mock Supabase to return the test content
      mockSupabase.single.mockResolvedValue({ data: content, error: null });

      const request = new NextRequest(
        'http://localhost:3000/api/review/test-1/submit',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'accept',
            feedback: 'Great content',
          }),
        }
      );
      const params = Promise.resolve({ id: 'test-1' });
      const response = await submitReview(request, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('success', true);
      expect(body.data).toHaveProperty('content');
      expect(body.data).toHaveProperty('message');
    });

    it('should return validation error format when feedback missing for rejection', async () => {
      const content = TestUtils.createContent({
        id: 'test-1',
        status: 'draft',
      });
      await TestUtils.writeContentFile(tempDir, content);

      const request = new NextRequest(
        'http://localhost:3000/api/review/test-1/submit',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'reject',
            feedback: '',
          }),
        }
      );
      const params = Promise.resolve({ id: 'test-1' });
      const response = await submitReview(request, { params });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(body.error).toHaveProperty('field', 'feedback');
    });

    it('should return 404 error format when content not found', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/review/non-existent/submit',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'accept',
            feedback: 'Good',
          }),
        }
      );
      const params = Promise.resolve({ id: 'non-existent' });
      const response = await submitReview(request, { params });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});
