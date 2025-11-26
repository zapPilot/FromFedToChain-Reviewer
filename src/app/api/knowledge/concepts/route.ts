import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { KnowledgeManager } from '@/lib/KnowledgeManager';

/**
 * GET /api/knowledge/concepts
 * List or search concepts
 *
 * Query params:
 * - category: Filter by category
 * - query: Search query
 * - fuzzy: Enable fuzzy search (default: true)
 * - includeContext: Include context in search (default: false)
 */
export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const query = searchParams.get('query');
    const fuzzy = searchParams.get('fuzzy') !== 'false';
    const includeContext = searchParams.get('includeContext') === 'true';

    // Initialize knowledge base if needed
    await KnowledgeManager.initialize();

    // If search query provided, search concepts
    if (query) {
      const results = await KnowledgeManager.searchConcepts(query, {
        category: category || null,
        fuzzy,
        includeContext,
      });
      return {
        success: true,
        data: results,
        count: results.length,
      };
    }

    // Otherwise list concepts
    const concepts = await KnowledgeManager.listConcepts(category);
    return {
      success: true,
      data: concepts,
      count: concepts.length,
    };
  }, 'Failed to get concepts');
}
