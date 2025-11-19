'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface PipelineRunSummary {
  contentId: string;
  finalStatus: string;
  stepCount: number;
}

export default function PipelineHubPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<PipelineRunSummary[]>([]);

  const triggerPipelineRun = async () => {
    const toastId = toast.loading('Scanning and processing pending content…');
    setIsRunning(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/pipeline/run-all', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to run pipeline');
      }

      const normalized: PipelineRunSummary[] = (data.results || []).map(
        (item: {
          contentId: string;
          finalStatus: string;
          steps?: Array<unknown>;
        }) => ({
          contentId: item.contentId,
          finalStatus: item.finalStatus,
          stepCount: Array.isArray(item.steps) ? item.steps.length : 0,
        })
      );

      setResults(normalized);
      const successMessage =
        data.message || `Processed ${normalized.length} content items.`;
      setMessage(successMessage);
      toast.success(successMessage, { id: toastId });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to run pipeline';
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
                Latest run summary ({results.length} item
                {results.length === 1 ? '' : 's'}):
              </p>
              <ul className="space-y-2">
                {results.map((item) => (
                  <li
                    key={item.contentId}
                    className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.contentId}
                      </p>
                      <p className="text-xs text-gray-600">
                        Final status: {item.finalStatus} · Steps executed:{' '}
                        {item.stepCount}
                      </p>
                    </div>
                    <Link
                      href={`/pipeline/${item.contentId}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View status →
                    </Link>
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
