import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { KnowledgeManager } from '@/lib/KnowledgeManager';

/**
 * GET /api/knowledge/stats
 * Get knowledge base statistics
 */
export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    // Initialize knowledge base if needed
    await KnowledgeManager.initialize();

    const stats = await KnowledgeManager.getStats();

    return {
      success: true,
      data: stats,
    };
  }, 'Failed to get knowledge stats');
}
