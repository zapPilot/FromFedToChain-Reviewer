'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PipelineStatusBoard } from '@/components/pipeline/PipelineStatusBoard';
import { PipelineActionButton } from '@/components/pipeline/PipelineActionButton';
import { WorkflowLogViewer } from '@/components/pipeline/WorkflowLogViewer';
import { useAllWorkflowsStatus } from '@/hooks/useWorkflowStatus';

export default function PipelinePage() {
  const params = useParams();
  const contentId = params.id as string;

  const { workflows, isAnyRunning } = useAllWorkflowsStatus({ contentId });

  // Get the most recent run ID for log viewing
  const latestRunId = workflows.translate.run?.id ||
                       workflows.audio.run?.id ||
                       workflows.m3u8.run?.id ||
                       workflows.cloudflare.run?.id ||
                       workflows.contentUpload.run?.id ||
                       null;

  const latestWorkflowName = workflows.translate.run ? 'Translation' :
                              workflows.audio.run ? 'Audio Generation' :
                              workflows.m3u8.run ? 'M3U8 Conversion' :
                              workflows.cloudflare.run ? 'Cloudflare Upload' :
                              workflows.contentUpload.run ? 'Content Upload' :
                              'Pipeline';

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline Processing</h1>
          <p className="text-muted-foreground">
            Content ID: <code className="rounded bg-muted px-2 py-1">{contentId}</code>
          </p>
        </div>
        <Link href="/review">
          <Button variant="outline">← Back to Review</Button>
        </Link>
      </div>

      {/* Action Button */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pipeline Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <PipelineActionButton
              contentId={contentId}
              variant="default"
            />
            {isAnyRunning && (
              <p className="text-sm text-muted-foreground">
                Pipeline is currently running. This may take several minutes.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Board */}
      <div className="mb-6">
        <PipelineStatusBoard contentId={contentId} />
      </div>

      {/* Workflow Logs */}
      <WorkflowLogViewer
        runId={latestRunId}
        workflowName={latestWorkflowName}
      />

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pipeline Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">How it works:</h3>
            <ol className="list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
              <li>Click "Process Pipeline" to start the translation workflow</li>
              <li>The system will automatically process all phases sequentially</li>
              <li>Each phase triggers the next one via GitHub Actions</li>
              <li>Monitor progress in real-time on this page</li>
              <li>Logs are available for download from GitHub</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold">Pipeline Phases:</h3>
            <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
              <li><strong>Translation:</strong> Translate content to English and Japanese</li>
              <li><strong>Audio Generation:</strong> Generate audio with Google TTS</li>
              <li><strong>M3U8 Conversion:</strong> Convert to HLS streaming format</li>
              <li><strong>Cloudflare Upload:</strong> Upload audio to Cloudflare R2</li>
              <li><strong>Content Upload:</strong> Upload metadata to R2</li>
            </ul>
          </div>

          <div className="rounded-lg bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Make sure your GitHub token is configured in environment variables.
              See the README for setup instructions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
