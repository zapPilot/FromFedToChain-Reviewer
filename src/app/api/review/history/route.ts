import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { ContentManager } from '@/lib/ContentManager';
import { ContentItem, PaginatedResponse } from '@/types/content';
import { paginate } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reviewer = searchParams.get('reviewer');
  const decision = searchParams.get('decision') as
    | 'accepted'
    | 'rejected'
    | null;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  return handleApiRoute(async () => {
    // Get review history
    let content = await ContentManager.getReviewHistory();

    // Apply reviewer filter
    if (reviewer) {
      content = content.filter(
        (c) => c.feedback?.content_review?.reviewer === reviewer
      );
    }

    // Apply decision filter
    if (decision) {
      content = content.filter(
        (c) => c.feedback?.content_review?.status === decision
      );
    }

    // Apply pagination
    const paginationResult = paginate(content, page, limit);

    const response: PaginatedResponse<ContentItem> = {
      content: paginationResult.items,
      pagination: paginationResult.pagination,
    };

    return response;
  }, 'Failed to fetch review history');
}
