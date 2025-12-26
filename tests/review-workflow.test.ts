import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ContentManager } from '@/lib/ContentManager';
import { TestUtils } from './setup';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

const CONTENT_ID = '2025-06-30-review-test';

describe('Review workflow', () => {
  let tempDir: string;
  let mockSupabase: any;
  let testContent: any;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();

    const draft = TestUtils.createContent({ id: CONTENT_ID, status: 'draft' });
    await TestUtils.writeContentFile(tempDir, draft);

    // Store test content for mock to return
    testContent = { ...draft };

    // Mock Supabase admin client with stateful content tracking
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn((updates: any) => {
        // Apply updates to test content
        Object.assign(testContent, updates);
        return mockSupabase;
      }),
      single: vi.fn(() => {
        return { data: testContent, error: null };
      }),
      limit: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase);
  });

  afterEach(async () => {
    await TestUtils.cleanupTempDir(tempDir);
    vi.clearAllMocks();
  });

  it('adds feedback when accepting content', async () => {
    await ContentManager.addContentFeedback(
      CONTENT_ID,
      'accepted',
      5,
      'reviewer',
      'Great content'
    );

    const updated = await ContentManager.readSource(CONTENT_ID);
    expect(updated.feedback.content_review?.status).toBe('accepted');
    expect(updated.feedback.content_review?.comments).toBe('Great content');
  });

  it('requires rejection feedback comment', async () => {
    await expect(
      ContentManager.addContentFeedback(
        CONTENT_ID,
        'rejected',
        1,
        'reviewer',
        ''
      )
    ).rejects.toThrow('Feedback comment is required when rejecting content');
  });

  it('updates review history ordering', async () => {
    await ContentManager.addContentFeedback(
      CONTENT_ID,
      'accepted',
      4,
      'reviewer',
      'Approved'
    );

    // Mock the review history query to return the updated content
    mockSupabase.order.mockResolvedValue({
      data: [testContent],
      error: null,
    });

    const history = await ContentManager.getReviewHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(CONTENT_ID);
  });
});
