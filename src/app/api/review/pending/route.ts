import { NextRequest, NextResponse } from 'next/server';
import { ContentManager } from '@/lib/ContentManager';
import { ContentItem, PaginatedResponse } from '@/types/content';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

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
    console.error('Error fetching pending content:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
