import { NextRequest, NextResponse } from 'next/server';
import { ContentPipelineService } from '@/lib/services/ContentPipelineService';

/**
 * POST /api/pipeline/process
 * Process content through the full pipeline (translation → audio → M3U8 → upload → social)
 *
 * Body:
 * - contentId: string - Content ID to process
 * - startFrom?: string - Optional pipeline step to start from
 */
export async function POST(request: NextRequest) {
  try {
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

    console.log(
      `🚀 Starting pipeline processing for content: ${contentId}${startFrom ? ` (from: ${startFrom})` : ''}`
    );

    // Process content through pipeline
    const result = await ContentPipelineService.processContent(
      contentId,
      startFrom
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Pipeline processing completed for ${contentId}`,
    });
  } catch (error) {
    console.error('Pipeline processing failed:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Pipeline processing failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pipeline/process
 * Get pipeline status for content
 *
 * Query params:
 * - contentId: string - Content ID to check
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get content status through ContentManager
    const { ContentManager } = await import('@/lib/ContentManager');
    const sourceContent = await ContentManager.readSource(contentId);

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        status: sourceContent.status,
        availableLanguages:
          await ContentManager.getAvailableLanguages(contentId),
        lastUpdated: sourceContent.updated_at,
      },
    });
  } catch (error) {
    console.error('Failed to get pipeline status:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get pipeline status',
      },
      { status: 500 }
    );
  }
}
