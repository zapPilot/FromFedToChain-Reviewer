import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { ContentManager } from '@/lib/ContentManager';
import { ContentDetailResponse, NavigationInfo } from '@/types/content';
import { NotFoundError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRoute(async () => {
    // Get the requested content
    let content;
    try {
      content = await ContentManager.readSource(id);
    } catch (error) {
      throw new NotFoundError('Content', id);
    }

    // Get all pending content for navigation
    const allPending = await ContentManager.getSourceForReview();
    const currentIndex = allPending.findIndex((c) => c.id === id);

    // Calculate navigation
    const navigation: NavigationInfo = {
      previous: currentIndex > 0 ? allPending[currentIndex - 1].id : null,
      next:
        currentIndex < allPending.length - 1
          ? allPending[currentIndex + 1].id
          : null,
    };

    const response: ContentDetailResponse = {
      content,
      navigation,
    };

    return response;
  }, 'Failed to fetch content detail');
}
