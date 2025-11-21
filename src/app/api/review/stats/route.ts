import { handleApiRoute } from '@/lib/api-helpers';
import { ContentManager } from '@/lib/ContentManager';
import { ReviewStats, Category } from '@/types/content';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  return handleApiRoute(async () => {
    // Get all source content from Git
    const allContent = await ContentManager.list(null, 'zh-TW');

    // Get review status from Supabase
    const { data: statusRecords, error } = await supabaseAdmin
      .from('content_status')
      .select('id, review_status, category');

    if (error) {
      console.error('Error fetching status from Supabase:', error);
      // Fall back to empty array if Supabase fails
    }

    // Create a map of content_id -> review_status
    const statusMap = new Map(
      statusRecords?.map((r) => [r.id, r.review_status]) || []
    );

    // Count pending (no review status or not rejected)
    const pending = allContent.filter((c) => {
      const reviewStatus = statusMap.get(c.id);
      // If no status record in Supabase, consider it pending
      // If status is explicitly rejected, exclude it
      return !reviewStatus || reviewStatus !== 'rejected';
    }).length;

    // Count reviewed (accepted)
    const reviewed = allContent.filter((c) => {
      const reviewStatus = statusMap.get(c.id);
      return reviewStatus === 'accepted';
    }).length;

    // Count rejected
    const rejected = allContent.filter((c) => {
      const reviewStatus = statusMap.get(c.id);
      return reviewStatus === 'rejected';
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
        const reviewStatus = statusMap.get(c.id);
        return !reviewStatus || reviewStatus !== 'rejected';
      })
      .forEach((c) => {
        byCategory[c.category]++;
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
