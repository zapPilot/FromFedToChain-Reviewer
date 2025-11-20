import { NextRequest, NextResponse } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { ContentPipelineService } from '@/lib/services/ContentPipelineService';
import { ContentSchema } from '@/lib/ContentSchema';
import type { Status } from '@/types/content';

/**
 * POST /api/pipeline/process
 * Process content through the full pipeline (translation → audio → M3U8 → upload → social)
 *
 * Body:
 * - contentId: string - Content ID to process
 * - startFrom?: string - Optional pipeline step to start from
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contentId, startFrom } = body;

  if (!contentId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameter: contentId',
      },
      { status: 400 }
    );
  }

  // Validate startFrom parameter
  let startStatus: Status | undefined;
  if (startFrom) {
    const allowed = ContentSchema.getStatuses();
    if (!allowed.includes(startFrom as Status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid pipeline step: ${startFrom}`,
        },
        { status: 400 }
      );
    }
    startStatus = startFrom as Status;
  }

  console.log(
    `🚀 Starting pipeline processing for content: ${contentId}${startFrom ? ` (from: ${startFrom})` : ''}`
  );

  return handleApiRoute(async () => {
    const result = await ContentPipelineService.processContent(
      contentId,
      startStatus
    );
    return result;
  }, 'Pipeline processing failed');
}

/**
 * GET /api/pipeline/process
 * Get pipeline status for content
 *
 * Query params:
 * - contentId: string - Content ID to check
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const contentId = searchParams.get('contentId');

  if (!contentId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameter: contentId',
      },
      { status: 400 }
    );
  }

  return handleApiRoute(async () => {
    const { ContentManager } = await import('@/lib/ContentManager');
    const sourceContent = await ContentManager.readSource(contentId);

    return {
      contentId,
      status: sourceContent.status,
      availableLanguages: await ContentManager.getAvailableLanguages(contentId),
      lastUpdated: sourceContent.updated_at,
    };
  }, 'Failed to get pipeline status');
}
