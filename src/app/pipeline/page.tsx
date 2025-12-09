'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface WorkflowTriggerResult {
  contentId: string;
  workflowsTriggered: string[];
  success: boolean;
  error?: string;
}

export default function PipelineHubPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<WorkflowTriggerResult[]>([]);

  const triggerPipelineRun = async () => {
    const toastId = toast.loading('Triggering GitHub Actions workflows…');
    setIsRunning(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/pipeline/run-all', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to trigger workflows');
      }

      setResults(data.results || []);
      const successMessage =
        data.message ||
        `Triggered workflows for ${data.successful || 0} content item(s)`;
      setMessage(successMessage);
      toast.success(successMessage, { id: toastId });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to trigger workflows';
      setError(errorMessage);
      toast.error(errorMessage, { id: toastId });
      setResults([]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Pipeline Control Center
        </h1>
        <p className="text-gray-600 mt-2">
          One click will run the same automation as{' '}
          <code>npm run pipeline</code>: the system scans for all approved or
          partially processed content and pushes each item through translation →
          audio → upload.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run All Approved Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={triggerPipelineRun}
            disabled={isRunning}
          >
            {isRunning ? 'Running pipeline…' : 'Process Pending Pipeline Work'}
          </Button>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {message}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Workflows triggered for {results.length} item
                {results.length === 1 ? '' : 's'}:
              </p>
              <ul className="space-y-2">
                {results.map((item) => (
                  <li
                    key={item.contentId}
                    className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.contentId}
                      </p>
                      {item.success ? (
                        <p className="text-xs text-gray-600">
                          ✓ Triggered {item.workflowsTriggered.length} workflow
                          {item.workflowsTriggered.length === 1
                            ? ''
                            : 's'}:{' '}
                          {item.workflowsTriggered
                            .map((w) =>
                              w.replace('pipeline-', '').replace('.yml', '')
                            )
                            .join(', ')}
                        </p>
                      ) : (
                        <p className="text-xs text-red-600">
                          ✗ Failed: {item.error}
                        </p>
                      )}
                    </div>
                    {item.success && (
                      <Link
                        href={`/pipeline/${item.contentId}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Monitor progress →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Activity (Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            This section will surface live polling, workflow logs, and retry
            controls. Until then, open any item above to monitor its dedicated
            dashboard.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Translation → Audio → M3U8 → Cloudflare Upload → Content Upload
            </li>
            <li>
              Each click sequences every outstanding item through those stages
              automatically.
            </li>
            <li>
              Need deeper visibility? Use the per-content dashboard at{' '}
              <code>/pipeline/&lt;content-id&gt;</code>.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
