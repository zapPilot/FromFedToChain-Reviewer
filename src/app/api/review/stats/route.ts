import { handleApiRoute } from '@/lib/api-helpers';
import { ContentManager } from '@/lib/ContentManager';
import { ReviewStats, Category } from '@/types/content';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  return handleApiRoute(async () => {
    // Get all source content from Git (now Supabase) for zh-TW
    const allContent = await ContentManager.list(null, 'zh-TW');

    // Count pending (draft status AND not rejected)
    const pending = allContent.filter((c) => {
      const isDraft = c.status === 'draft';
      const isRejected = c.feedback?.content_review?.status === 'rejected';
      return isDraft && !isRejected;
    }).length;

    // Count reviewed (accepted status OR explicitly accepted review)
    const reviewed = allContent.filter((c) => {
      const isAccepted = c.feedback?.content_review?.status === 'accepted';
      const isNotDraft = c.status !== 'draft';
      return isAccepted || isNotDraft;
    }).length;

    // Count rejected
    const rejected = allContent.filter((c) => {
      return c.feedback?.content_review?.status === 'rejected';
    }).length;

    // Count by category (only pending content)
    const byCategory: Record<Category, number> = {
      'daily-news': 0,
      ethereum: 0,
      macro: 0,
      startup: 0,
      ai: 0,
      defi: 0,
    };

    allContent
      .filter((c) => {
        const isDraft = c.status === 'draft';
        const isRejected = c.feedback?.content_review?.status === 'rejected';
        return isDraft && !isRejected;
      })
      .forEach((c) => {
        if (byCategory[c.category] !== undefined) {
          byCategory[c.category]++;
        }
      });

    const stats: ReviewStats = {
      pending,
      reviewed,
      rejected,
      total: allContent.length,
      byCategory,
    };

    return stats;
  }, 'Failed to fetch review stats');
}
