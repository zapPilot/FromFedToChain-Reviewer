import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentReadService } from '@/lib/services/ContentReadService';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe('ContentReadService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase);
  });

  describe('list', () => {
    it('should order content by date ascending', async () => {
      await ContentReadService.list();

      expect(mockSupabase.order).toHaveBeenCalledWith('date', {
        ascending: true,
      });
    });

    it('should apply status filter if provided', async () => {
      await ContentReadService.list('draft');

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'draft');
    });

    it('should apply language filter if provided', async () => {
      await ContentReadService.list(null, 'en-US');

      expect(mockSupabase.eq).toHaveBeenCalledWith('language', 'en-US');
    });
  });
});
