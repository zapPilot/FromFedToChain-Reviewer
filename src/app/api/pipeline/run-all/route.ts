import { handleApiRoute } from '@/lib/api-helpers';
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
  return handleApiRoute(async () => {
    const pending = await ContentPipelineService.getAllPendingContent();

    if (pending.length === 0) {
      return {
        success: true,
        processed: 0,
        results: [] as PipelineRunSummary[],
        message: 'No approved or in-progress content requires pipeline work.',
      };
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

    return {
      success: true,
      processed: results.length,
      results,
      message: `Processed ${results.length} content item${results.length === 1 ? '' : 's'} through the pipeline`,
    };
  }, 'Failed to run pipeline for approved content');
}
