import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getQueue } from '@/app/api/pipeline/queue/route';
import { GET as getStatus } from '@/app/api/pipeline/status/route';
import { ContentManager } from '@/lib/ContentManager';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mock ContentManager
vi.mock('@/lib/ContentManager', () => ({
  ContentManager: {
    getPendingPipelineItems: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe('Pipeline API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/pipeline/queue', () => {
    it('returns queue of pending pipeline items', async () => {
      const mockItems = [
        {
          id: 'content-1',
          title: 'Test Content 1',
          status: 'reviewed',
          category: 'daily-news',
          feedback: {
            content_review: { status: 'accepted', reviewer: 'admin' },
          },
        },
        {
          id: 'content-2',
          title: 'Test Content 2',
          status: 'translated',
          category: 'ethereum',
          feedback: null,
        },
      ];
      vi.mocked(ContentManager.getPendingPipelineItems).mockResolvedValue(
        mockItems as any
      );

      const response = await getQueue();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.queue).toHaveLength(2);
      expect(body.data.queue[0].id).toBe('content-1');
      expect(body.data.queue[0].reviewStatus).toBe('accepted');
      expect(body.data.count).toBe(2);
    });

    it('returns empty queue when no pending items', async () => {
      vi.mocked(ContentManager.getPendingPipelineItems).mockResolvedValue([]);

      const response = await getQueue();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.queue).toHaveLength(0);
      expect(body.data.count).toBe(0);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(ContentManager.getPendingPipelineItems).mockRejectedValue(
        new Error('Database error')
      );

      const response = await getQueue();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/pipeline/status', () => {
    it('returns status for valid contentId', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'content-1',
            status: 'wav',
            updated_at: '2025-01-01T00:00:00Z',
          },
          error: null,
        }),
      };
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/status?contentId=content-1'
      );
      const response = await getStatus(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.contentId).toBe('content-1');
      expect(body.status).toBe('wav');
      expect(body.lastUpdated).toBe('2025-01-01T00:00:00Z');
    });

    it('returns 400 when contentId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/status'
      );
      const response = await getStatus(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Missing contentId');
    });

    it('returns 404 when content not found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/status?contentId=non-existent'
      );
      const response = await getStatus(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Content not found');
    });

    it('handles database errors', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          throw new Error('Database connection error');
        }),
      };
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/status?contentId=content-1'
      );
      const response = await getStatus(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to get status');
    });
  });
});
