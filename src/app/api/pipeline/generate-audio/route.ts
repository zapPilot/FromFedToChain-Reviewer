import { NextRequest, NextResponse } from 'next/server';
import { GitHubWorkflowService } from '@/lib/services/GitHubWorkflowService';
import { isSupportedLanguage } from '@/config/languages';

/**
 * POST /api/pipeline/generate-audio
 * Trigger GitHub Actions workflow to generate audio files (WAV and/or M3U8)
 *
 * Body:
 * - contentId: string - Content ID to process
 * - language: string - Target language
 * - format?: "wav" | "m3u8" | "both" - Audio format (default: "wav")
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contentId, language, format = 'wav' } = body;

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

  try {
    // Determine which workflow to trigger based on format
    let workflow: string;
    const inputs = { contentId, language };

    if (format === 'm3u8') {
      workflow = 'pipeline-m3u8.yml';
    } else if (format === 'both') {
      // Trigger audio first, M3U8 will be triggered separately or in sequence
      await GitHubWorkflowService.triggerWorkflow('pipeline-audio.yml', inputs);
      workflow = 'pipeline-m3u8.yml';
    } else {
      // Default: wav
      workflow = 'pipeline-audio.yml';
    }

    const result = await GitHubWorkflowService.triggerWorkflow(
      workflow,
      inputs
    );

    return NextResponse.json({
      success: true,
      workflowTriggered: true,
      workflow,
      message:
        'Audio generation started in background. Check status in a few minutes.',
      data: result,
    });
  } catch (error) {
    console.error('Failed to trigger audio generation workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger workflow',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
