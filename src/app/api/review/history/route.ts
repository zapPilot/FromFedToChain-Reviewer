import { NextRequest, NextResponse } from 'next/server';
import { ContentManager } from '@/lib/ContentManager';
import { ContentItem, PaginatedResponse } from '@/types/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reviewer = searchParams.get('reviewer');
    const decision = searchParams.get('decision') as
      | 'accepted'
      | 'rejected'
      | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

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

    // Calculate pagination
    const total = content.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedContent = content.slice(start, start + limit);

    const response: PaginatedResponse<ContentItem> = {
      content: paginatedContent,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching review history:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch review history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
