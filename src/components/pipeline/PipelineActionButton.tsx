'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { githubClient, WORKFLOWS } from '@/lib/github-client';
import { Button, type ButtonProps } from '@/components/ui/button';
// TODO: Install sonner for toast notifications
// import { toast } from 'sonner';

interface PipelineActionButtonProps {
  contentId: string;
  variant?: ButtonProps['variant'];
  className?: string;
  onSuccess?: () => void;
}

export function PipelineActionButton({
  contentId,
  variant = 'default',
  className,
  onSuccess,
}: PipelineActionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

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
      // TODO: Use toast notification when sonner is installed
      console.log('Pipeline started! Translation workflow has been triggered.');
      alert('Pipeline started! Check the pipeline page for progress.');
      onSuccess?.();
    },
    onError: (error: Error) => {
      // TODO: Use toast notification when sonner is installed
      console.error('Failed to start pipeline:', error.message);
      alert(`Failed to start pipeline: ${error.message}`);
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
