import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentManager } from '@/lib/ContentManager';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mock getSupabaseAdmin
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe('ContentManager Pipeline Logic', () => {
  let mockBuilder: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create query builder mock
    mockBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    // Explicitly set return values to ensure chaining works robustly
    mockBuilder.select.mockReturnValue(mockBuilder);
    mockBuilder.in.mockReturnValue(mockBuilder);
    mockBuilder.order.mockReturnValue(mockBuilder);
    mockBuilder.eq.mockReturnValue(mockBuilder);

    // Create client mock
    mockClient = {
      from: vi.fn().mockReturnValue(mockBuilder),
    };

    (getSupabaseAdmin as any).mockReturnValue(mockClient);
  });

  describe('getPendingPipelineItems', () => {
    it('should return approved and in_progress items', async () => {
      const mockData = [
        { id: '1', status: 'approved' },
        { id: '2', status: 'in_progress' },
      ];
      mockBuilder.order.mockResolvedValue({ data: mockData, error: null });

      const result = await ContentManager.getPendingPipelineItems();
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['1', '2']);
    });

    it('should return draft items that are accepted', async () => {
      const mockData = [
        {
          id: 'accepted-draft',
          status: 'draft',
          feedback: { content_review: { status: 'accepted' } },
        },
      ];
      mockBuilder.order.mockResolvedValue({ data: mockData, error: null });

      const result = await ContentManager.getPendingPipelineItems();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('accepted-draft');
    });

    it('should filter out draft items that are not accepted', async () => {
      const mockData = [
        {
          id: 'pending-draft',
          status: 'draft',
          feedback: { content_review: { status: 'pending' } },
        },
        {
          id: 'rejected-draft',
          status: 'draft',
          feedback: { content_review: { status: 'rejected' } },
        },
        {
          id: 'no-feedback-draft',
          status: 'draft',
          feedback: {},
        },
      ];
      mockBuilder.order.mockResolvedValue({ data: mockData, error: null });

      const result = await ContentManager.getPendingPipelineItems();
      expect(result).toHaveLength(0);
    });

    it('should handle mixed results correctly', async () => {
      const mockData = [
        { id: 'ok-1', status: 'approved' },
        {
          id: 'bad-1',
          status: 'draft',
          feedback: { content_review: { status: 'pending' } },
        },
        {
          id: 'ok-2',
          status: 'draft',
          feedback: { content_review: { status: 'accepted' } },
        },
      ];
      mockBuilder.order.mockResolvedValue({ data: mockData, error: null });

      const result = await ContentManager.getPendingPipelineItems();
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['ok-1', 'ok-2']);
    });

    it('should return items with reviewed status', async () => {
      const mockData = [
        { id: 'reviewed-1', status: 'reviewed' },
        { id: 'reviewed-2', status: 'reviewed' },
      ];
      mockBuilder.order.mockResolvedValue({ data: mockData, error: null });

      const result = await ContentManager.getPendingPipelineItems();
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['reviewed-1', 'reviewed-2']);
    });

    it('should return mixed reviewed, approved, and draft items', async () => {
      const mockData = [
        { id: 'reviewed-1', status: 'reviewed' },
        { id: 'approved-1', status: 'approved' },
        {
          id: 'draft-accepted',
          status: 'draft',
          feedback: { content_review: { status: 'accepted' } },
        },
        {
          id: 'draft-rejected',
          status: 'draft',
          feedback: { content_review: { status: 'rejected' } },
        },
      ];
      mockBuilder.order.mockResolvedValue({ data: mockData, error: null });

      const result = await ContentManager.getPendingPipelineItems();
      expect(result).toHaveLength(3);
      expect(result.map((i) => i.id)).toEqual([
        'reviewed-1',
        'approved-1',
        'draft-accepted',
      ]);
    });
  });

  describe('getSourceForReview', () => {
    it('should return items needing review (no feedback or pending status)', async () => {
      const mockDrafts = [
        { id: 'new-item', status: 'draft', feedback: {} },
        {
          id: 'pending-item',
          status: 'draft',
          feedback: { content_review: { status: 'pending' } },
        },
      ];
      // Mock list results via DB response
      mockBuilder.order.mockResolvedValue({ data: mockDrafts, error: null });

      const result = await ContentManager.getSourceForReview();
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['new-item', 'pending-item']);
    });

    it('should exclude accepted and rejected items', async () => {
      const mockDrafts = [
        {
          id: 'accepted-item',
          status: 'draft',
          feedback: { content_review: { status: 'accepted' } },
        },
        {
          id: 'rejected-item',
          status: 'draft',
          feedback: { content_review: { status: 'rejected' } },
        },
      ];
      mockBuilder.order.mockResolvedValue({ data: mockDrafts, error: null });

      const result = await ContentManager.getSourceForReview();
      expect(result).toHaveLength(0);
    });

    it('should handle mixed review states', async () => {
      const mockDrafts = [
        { id: 'needs-review', status: 'draft', feedback: {} },
        {
          id: 'accepted',
          status: 'draft',
          feedback: { content_review: { status: 'accepted' } },
        },
      ];
      mockBuilder.order.mockResolvedValue({ data: mockDrafts, error: null });

      const result = await ContentManager.getSourceForReview();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('needs-review');
    });
  });
});
