import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { KnowledgeManager } from '@/lib/KnowledgeManager';
import { NotFoundError } from '@/lib/errors';

/**
 * GET /api/knowledge/concepts/[id]
 * Get a single concept by ID or name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRoute(async () => {
    // Initialize knowledge base if needed
    await KnowledgeManager.initialize();

    const concept = await KnowledgeManager.getConcept(id);

    if (!concept) {
      throw new NotFoundError('Concept', id);
    }

    return {
      success: true,
      data: concept,
    };
  }, 'Failed to get concept');
}
