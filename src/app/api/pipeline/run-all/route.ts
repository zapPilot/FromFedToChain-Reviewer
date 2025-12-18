import { NextResponse } from 'next/server';
import { GitHubWorkflowService } from '@/lib/services/GitHubWorkflowService';
import { ContentManager } from '@/lib/ContentManager';

interface WorkflowTriggerResult {
  contentId: string;
  workflowsTriggered: string[];
  success: boolean;
  error?: string;
}

/**
 * POST /api/pipeline/run-all
 * Trigger pipeline workflows for all pending content
 */
export async function POST() {
  try {
    // Get pending content using shared logic
    const pending = await ContentManager.getPendingPipelineItems();

    if (!pending || pending.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        results: [],
        message: 'No approved or in-progress content requires pipeline work.',
      });
    }

    console.log(
      `🚀 Triggering pipeline workflows for ${pending.length} content item(s)...`
    );

    const results: WorkflowTriggerResult[] = [];

    // Trigger unified pipeline workflow for each pending content item
    // All stages (translate → audio → m3u8 → cloudflare → content-upload) run sequentially in single workflow
    for (const item of pending) {
      const contentId = item.id;

      try {
        console.log(`Triggering unified pipeline for content: ${contentId}`);

        // Trigger unified workflow starting from translate stage
        await GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId,
          start_stage: 'translate',
        });

        results.push({
          contentId,
          workflowsTriggered: ['pipeline-unified.yml'],
          success: true,
        });
      } catch (error) {
        console.error(`Failed to trigger pipeline for ${contentId}:`, error);
        results.push({
          contentId,
          workflowsTriggered: [],
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results,
      message: `Started unified pipeline for ${successCount}/${results.length} content item(s). All stages will execute sequentially in single workflow.`,
    });
  } catch (error) {
    console.error('Failed to run pipeline for pending content:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run pipeline for pending content',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
