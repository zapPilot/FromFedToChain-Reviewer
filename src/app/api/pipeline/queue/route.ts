import { NextResponse } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { ContentManager } from '@/lib/ContentManager';
export const dynamic = 'force-dynamic';

/**
 * GET /api/pipeline/queue
 * Get list of content pending pipeline execution
 */
export async function GET() {
  return handleApiRoute(async () => {
    const pendingItems = await ContentManager.getPendingPipelineItems();

    // Map to a simplified structure for the UI if needed, or return as is
    // For now, returning relevant fields for display
    const queue = pendingItems.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      category: item.category,
      reviewStatus: item.feedback?.content_review?.status,
      reviewer: item.feedback?.content_review?.reviewer,
    }));

    return {
      queue,
      count: queue.length,
    };
  }, 'Failed to fetch pipeline queue');
}
