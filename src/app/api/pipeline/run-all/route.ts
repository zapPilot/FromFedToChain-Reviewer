import { NextResponse } from 'next/server';
import { ContentPipelineService } from '@/lib/services/ContentPipelineService';

interface PipelineRunSummary {
  contentId: string;
  finalStatus: string;
  steps: Array<{
    from: string;
    to: string | null;
    description: string;
    success: boolean;
  }>;
}

export async function POST() {
  try {
    const pending = await ContentPipelineService.getAllPendingContent();

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        results: [] as PipelineRunSummary[],
        message: 'No approved or in-progress content requires pipeline work.',
      });
    }

    const results: PipelineRunSummary[] = [];

    for (const item of pending) {
      const outcome = await ContentPipelineService.processContent(
        item.content.id
      );
      results.push({
        contentId: item.content.id,
        finalStatus: outcome.finalStatus,
        steps: outcome.steps,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      message: `Processed ${results.length} content item${results.length === 1 ? '' : 's'} through the pipeline`,
    });
  } catch (error) {
    console.error('Bulk pipeline run failed:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to run pipeline for approved content',
      },
      { status: 500 }
    );
  }
}
