import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getHistory } from '@/app/api/review/history/route';
import { ContentManager } from '@/lib/ContentManager';

// Mock ContentManager
vi.mock('@/lib/ContentManager', () => ({
  ContentManager: {
    getReviewHistory: vi.fn(),
  },
}));

describe('GET /api/review/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns review history with pagination', async () => {
    const mockHistory = [
      {
        id: 'content-1',
        feedback: { content_review: { status: 'accepted', reviewer: 'admin' } },
      },
      {
        id: 'content-2',
        feedback: { content_review: { status: 'rejected', reviewer: 'admin' } },
      },
    ];
    vi.mocked(ContentManager.getReviewHistory).mockResolvedValue(
      mockHistory as any
    );

    const request = new NextRequest('http://localhost:3000/api/review/history');
    const response = await getHistory(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.content).toHaveLength(2);
    expect(body.data.pagination).toBeDefined();
  });

  it('filters by reviewer', async () => {
    const mockHistory = [
      {
        id: 'content-1',
        feedback: { content_review: { status: 'accepted', reviewer: 'admin' } },
      },
      {
        id: 'content-2',
        feedback: { content_review: { status: 'accepted', reviewer: 'other' } },
      },
    ];
    vi.mocked(ContentManager.getReviewHistory).mockResolvedValue(
      mockHistory as any
    );

    const request = new NextRequest(
      'http://localhost:3000/api/review/history?reviewer=admin'
    );
    const response = await getHistory(request);
    const body = await response.json();

    expect(body.data.content).toHaveLength(1);
    expect(body.data.content[0].id).toBe('content-1');
  });

  it('filters by decision', async () => {
    const mockHistory = [
      {
        id: 'content-1',
        feedback: { content_review: { status: 'accepted', reviewer: 'admin' } },
      },
      {
        id: 'content-2',
        feedback: { content_review: { status: 'rejected', reviewer: 'admin' } },
      },
    ];
    vi.mocked(ContentManager.getReviewHistory).mockResolvedValue(
      mockHistory as any
    );

    const request = new NextRequest(
      'http://localhost:3000/api/review/history?decision=rejected'
    );
    const response = await getHistory(request);
    const body = await response.json();

    expect(body.data.content).toHaveLength(1);
    expect(body.data.content[0].id).toBe('content-2');
  });

  it('applies pagination parameters', async () => {
    const mockHistory = Array.from({ length: 25 }, (_, i) => ({
      id: `content-${i}`,
      feedback: { content_review: { status: 'accepted', reviewer: 'admin' } },
    }));
    vi.mocked(ContentManager.getReviewHistory).mockResolvedValue(
      mockHistory as any
    );

    const request = new NextRequest(
      'http://localhost:3000/api/review/history?page=2&limit=10'
    );
    const response = await getHistory(request);
    const body = await response.json();

    expect(body.data.content).toHaveLength(10);
    expect(body.data.pagination.page).toBe(2);
    expect(body.data.pagination.limit).toBe(10);
    expect(body.data.pagination.totalPages).toBe(3);
  });

  it('handles errors gracefully', async () => {
    vi.mocked(ContentManager.getReviewHistory).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost:3000/api/review/history');
    const response = await getHistory(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
