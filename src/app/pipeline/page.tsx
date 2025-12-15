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

interface QueueItem {
  id: string;
  title: string;
  status: string;
  category: string;
  reviewStatus?: string;
  reviewer?: string;
}

export default function PipelineHubPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<WorkflowTriggerResult[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // Fetch queue on mount
  useState(() => {
    fetchQueue();
  });

  async function fetchQueue() {
    try {
      setLoadingQueue(true);
      const res = await fetch('/api/pipeline/queue', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setQueue(data.data?.queue || []);
      }
    } catch (e) {
      console.error('Failed to fetch pipeline queue', e);
    } finally {
      setLoadingQueue(false);
    }
  }

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

      // Refresh queue after run
      fetchQueue();
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
          <CardTitle>Pending Pipeline Work ({queue.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Queue List */}
          <div className="rounded-md border border-gray-200 bg-white">
            {loadingQueue ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading queue...
              </div>
            ) : queue.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No items pending pipeline execution.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {queue.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 p-3 text-sm hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-md">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {item.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {item.category}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {item.status === 'draft'
                          ? 'Review Accepted'
                          : item.status === 'reviewed'
                            ? 'Reviewed'
                            : item.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            className="w-full"
            onClick={triggerPipelineRun}
            disabled={isRunning || queue.length === 0}
          >
            {isRunning
              ? 'Running pipeline…'
              : queue.length > 0
                ? `Process ${queue.length} Pending Item${queue.length === 1 ? '' : 's'}`
                : 'No Pending Work'}
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
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                Execution Results
              </p>
              <ul className="space-y-2">
                {results.map((item) => (
                  <li
                    key={item.contentId}
                    className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 md:flex-row md:items-center md:justify-between bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.contentId}
                      </p>
                      {item.success ? (
                        <p className="text-xs text-green-600">
                          ✓ Triggered {item.workflowsTriggered.length} workflow
                          {item.workflowsTriggered.length === 1 ? '' : 's'}
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
                        Monitor →
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
