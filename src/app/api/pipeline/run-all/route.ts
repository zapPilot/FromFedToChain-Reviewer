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

    // Trigger translate workflow for each pending content item
    // The workflow chain (audio → m3u8 → cloudflare → content-upload) will proceed automatically
    for (const item of pending) {
      const contentId = item.id;

      try {
        console.log(`Triggering pipeline chain for content: ${contentId}`);

        // Trigger only the entry point - subsequent workflows will trigger automatically
        await GitHubWorkflowService.triggerWorkflow('pipeline-translate.yml', {
          contentId,
        });

        results.push({
          contentId,
          workflowsTriggered: ['pipeline-translate.yml (chain entry point)'],
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
      message: `Started pipeline chains for ${successCount}/${results.length} content item(s). Workflows will execute sequentially.`,
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
