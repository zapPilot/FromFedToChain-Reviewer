import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { ContentManager } from '@/lib/ContentManager';
import { ContentItem, PaginatedResponse } from '@/types/content';
import { paginate } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search');

  return handleApiRoute(async () => {
    // Get all pending content for review
    let content = await ContentManager.getSourceForReview();

    // Apply category filter
    if (category) {
      content = content.filter((c) => c.category === category);
    }

    // Apply search filter (search in title and content)
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      content = content.filter(
        (c) =>
          c.title.toLowerCase().includes(searchLower) ||
          c.content.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const paginationResult = paginate(content, page, limit);

    const response: PaginatedResponse<ContentItem> = {
      content: paginationResult.items,
      pagination: paginationResult.pagination,
    };

    return response;
  }, 'Failed to fetch pending content');
}
