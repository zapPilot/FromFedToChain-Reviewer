import { NextRequest, NextResponse } from 'next/server';
import { GitHubWorkflowService } from '@/lib/services/GitHubWorkflowService';

/**
 * POST /api/pipeline/process
 * Trigger full pipeline workflows (translation → audio → M3U8 → upload)
 *
 * Body:
 * - contentId: string - Content ID to process
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contentId } = body;

  if (!contentId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameter: contentId',
      },
      { status: 400 }
    );
  }

  console.log(`🚀 Triggering full pipeline for content: ${contentId}`);

  try {
    // Define pipeline workflow sequence
    const workflows: {
      step: string;
      workflow: import('@/types/github').WorkflowName;
    }[] = [
      { step: 'translate', workflow: 'pipeline-translate.yml' },
      { step: 'audio', workflow: 'pipeline-audio.yml' },
      { step: 'm3u8', workflow: 'pipeline-m3u8.yml' },
      { step: 'cloudflare', workflow: 'pipeline-cloudflare.yml' },
    ];

    const inputs = { contentId };

    // Trigger each workflow (they will run sequentially in GitHub Actions)
    for (const { step, workflow } of workflows) {
      console.log(`Triggering ${step} workflow...`);
      await GitHubWorkflowService.triggerWorkflow(workflow, inputs);
    }

    return NextResponse.json({
      success: true,
      message: 'Pipeline workflows triggered successfully',
      workflows: workflows.map((w) => w.workflow),
      contentId,
    });
  } catch (error) {
    console.error('Failed to trigger pipeline workflows:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger pipeline',
        details: error instanceof Error ? error.message : String(error),
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

  try {
    const { ContentManager } = await import('@/lib/ContentManager');
    const sourceContent = await ContentManager.readSource(contentId);

    return NextResponse.json({
      success: true,
      contentId,
      status: sourceContent.status,
      availableLanguages: await ContentManager.getAvailableLanguages(contentId),
      lastUpdated: sourceContent.updated_at,
    });
  } catch (error) {
    console.error('Failed to get pipeline status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get pipeline status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
