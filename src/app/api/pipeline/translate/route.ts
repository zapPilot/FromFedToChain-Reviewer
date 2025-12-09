import { NextRequest, NextResponse } from 'next/server';
import { GitHubWorkflowService } from '@/lib/services/GitHubWorkflowService';

/**
 * POST /api/pipeline/translate
 * Trigger GitHub Actions workflow to translate content
 *
 * Body:
 * - contentId: string - Content ID to translate
 * - targetLanguage?: string - Specific language (passed to workflow, default: all)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contentId, targetLanguage } = body;

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
    `🌐 Triggering translation workflow for ${contentId}${targetLanguage ? ` (language: ${targetLanguage})` : ' (all languages)'}...`
  );

  try {
    const inputs: Record<string, string> = { contentId };
    if (targetLanguage) {
      inputs.targetLanguage = targetLanguage;
    }

    const result = await GitHubWorkflowService.triggerWorkflow(
      'pipeline-translate.yml',
      inputs
    );

    return NextResponse.json({
      success: true,
      workflowTriggered: true,
      workflow: 'pipeline-translate.yml',
      message: 'Translation workflow started in background.',
      data: result,
    });
  } catch (error) {
    console.error('Failed to trigger translation workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger translation workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pipeline/translate
 * Get list of content needing translation
 */
export async function GET(request: NextRequest) {
  try {
    const { ContentManager } = await import('@/lib/ContentManager');
    const content = await ContentManager.getSourceByStatus('reviewed');

    return NextResponse.json({
      success: true,
      data: content,
      count: content.length,
    });
  } catch (error) {
    console.error('Failed to get content needing translation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get content needing translation',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
