'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { githubClient } from '@/lib/github-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkflowLogViewerProps {
  runId: number | null;
  workflowName: string;
}

export function WorkflowLogViewer({
  runId,
  workflowName,
}: WorkflowLogViewerProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: logUrl, isLoading } = useQuery({
    queryKey: ['workflow-logs', runId],
    queryFn: () => {
      if (!runId) return null;
      return githubClient.getWorkflowLogs(runId);
    },
    enabled: !!runId && expanded,
  });

  if (!runId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active workflow. Start the pipeline to see logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Workflow Logs - {workflowName}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Logs' : 'Show Logs'}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : logUrl ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Logs are available as a downloadable archive from GitHub.
              </p>
              <Button asChild variant="outline">
                <a
                  href={logUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <span>📥</span>
                  Download Logs
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Logs not available yet. They may still be processing.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
