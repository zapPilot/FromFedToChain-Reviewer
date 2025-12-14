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
    const workflows = [
      'pipeline-translate.yml',
      'pipeline-audio.yml',
      'pipeline-m3u8.yml',
      'pipeline-cloudflare.yml',
    ];

    // Trigger workflows for each pending content item
    for (const item of pending) {
      const contentId = item.id;
      const triggeredWorkflows: string[] = [];

      try {
        console.log(`Triggering workflows for content: ${contentId}`);

        // Trigger each workflow in sequence
        for (const workflow of workflows) {
          await GitHubWorkflowService.triggerWorkflow(workflow, { contentId });
          triggeredWorkflows.push(workflow);
        }

        results.push({
          contentId,
          workflowsTriggered: triggeredWorkflows,
          success: true,
        });
      } catch (error) {
        console.error(`Failed to trigger workflows for ${contentId}:`, error);
        results.push({
          contentId,
          workflowsTriggered: triggeredWorkflows,
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
      message: `Triggered pipeline workflows for ${successCount}/${results.length} content item(s)`,
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
