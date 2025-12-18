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
    // Use unified workflow with appropriate start_stage
    const workflow = 'pipeline-unified.yml';
    let startStage: string;

    if (format === 'm3u8') {
      // Start directly at M3U8 conversion (assumes WAV already exists)
      startStage = 'm3u8';
    } else if (format === 'both') {
      // Start at audio generation, will proceed through M3U8 automatically
      startStage = 'audio';
    } else {
      // Default: wav only
      startStage = 'audio';
    }

    const inputs = { contentId, language, start_stage: startStage };

    const result = await GitHubWorkflowService.triggerWorkflow(
      workflow,
      inputs
    );

    return NextResponse.json({
      success: true,
      workflowTriggered: true,
      workflow,
      startStage,
      format,
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
