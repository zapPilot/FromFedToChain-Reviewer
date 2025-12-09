'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { githubClient, WORKFLOWS } from '@/lib/github-client';
import { Button, type ButtonProps } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface PipelineActionButtonProps {
  contentId: string;
  variant?: ButtonProps['variant'];
  className?: string;
  onSuccess?: () => void;
  navigateToStatus?: boolean;
}

export function PipelineActionButton({
  contentId,
  variant = 'default',
  className,
  onSuccess,
  navigateToStatus = true,
}: PipelineActionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const triggerPipeline = useMutation({
    mutationFn: async () => {
      if (!githubClient.isConfigured()) {
        throw new Error(
          'GitHub token not configured. Set NEXT_PUBLIC_GITHUB_TOKEN environment variable.'
        );
      }

      // Trigger translation workflow (first step)
      await githubClient.triggerWorkflow(WORKFLOWS.TRANSLATE, { contentId });

      return { contentId };
    },
    onSuccess: () => {
      toast.success('Pipeline started! Translation workflow triggered.', {
        description: navigateToStatus
          ? 'Redirecting to status page...'
          : 'Check the pipeline page for progress.',
      });

      if (navigateToStatus) {
        setTimeout(() => {
          router.push(`/pipeline/${contentId}`);
        }, 1000);
      }

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error('Failed to start pipeline', {
        description: error.message,
      });
    },
  });

  const handleClick = async () => {
    setIsProcessing(true);
    try {
      await triggerPipeline.mutateAsync();
    } finally {
      // Keep processing state for a moment to show feedback
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={triggerPipeline.isPending || isProcessing}
    >
      {triggerPipeline.isPending || isProcessing ? (
        <>
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Starting Pipeline...
        </>
      ) : (
        <>
          <span className="mr-2">▶</span>
          Process Pipeline
        </>
      )}
    </Button>
  );
}
