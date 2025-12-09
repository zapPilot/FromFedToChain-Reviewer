import { NextRequest, NextResponse } from 'next/server';
import { GitHubWorkflowService } from '@/lib/services/GitHubWorkflowService';
import { isSupportedLanguage } from '@/config/languages';

/**
 * POST /api/pipeline/upload
 * Trigger GitHub Actions workflow to upload audio files to Cloudflare R2
 *
 * Body:
 * - contentId: string - Content ID
 * - language: string - Target language
 * - format?: "wav" | "m3u8" | "both" - Upload format (default: "both")
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contentId, language, format = 'both' } = body;

  if (!contentId || !language) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameters: contentId, language',
      },
      { status: 400 }
    );
  }

  if (!isSupportedLanguage(language)) {
    return NextResponse.json(
      {
        success: false,
        error: `Unsupported language: ${language}`,
      },
      { status: 400 }
    );
  }

  console.log(
    `☁️ Triggering R2 upload workflow for ${contentId} (${language}, format: ${format})...`
  );

  try {
    const inputs = { contentId, language, format };

    const result = await GitHubWorkflowService.triggerWorkflow(
      'pipeline-cloudflare.yml',
      inputs
    );

    return NextResponse.json({
      success: true,
      workflowTriggered: true,
      workflow: 'pipeline-cloudflare.yml',
      message: 'R2 upload workflow started in background.',
      data: result,
    });
  } catch (error) {
    console.error('Failed to trigger R2 upload workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger upload workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
