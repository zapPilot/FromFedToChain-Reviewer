'use client';

import { useAllWorkflowsStatus } from '@/hooks/useWorkflowStatus';
import { cn } from '@/lib/utils';

interface PipelineStatusBoardProps {
  contentId: string;
}

interface PhaseStatus {
  name: string;
  status: 'idle' | 'queued' | 'in_progress' | 'completed' | 'failed';
  label: string;
  description: string;
}

export function PipelineStatusBoard({ contentId }: PipelineStatusBoardProps) {
  const { workflows, isAnyRunning } = useAllWorkflowsStatus({ contentId });

  const phases: PhaseStatus[] = [
    {
      name: 'translate',
      status: getPhaseStatus(workflows.translate),
      label: 'Translation',
      description: 'Translate content to target languages',
    },
    {
      name: 'audio',
      status: getPhaseStatus(workflows.audio),
      label: 'Audio Generation',
      description: 'Generate audio with Google TTS',
    },
    {
      name: 'm3u8',
      status: getPhaseStatus(workflows.m3u8),
      label: 'M3U8 Conversion',
      description: 'Convert audio to HLS streaming format',
    },
    {
      name: 'cloudflare',
      status: getPhaseStatus(workflows.cloudflare),
      label: 'Cloudflare Upload',
      description: 'Upload audio to Cloudflare R2',
    },
    {
      name: 'content',
      status: getPhaseStatus(workflows.contentUpload),
      label: 'Content Upload',
      description: 'Upload content metadata to R2',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pipeline Status</h2>
        {isAnyRunning && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Processing...
          </div>
        )}
      </div>

      <div className="space-y-2">
        {phases.map((phase, index) => (
          <PhaseCard key={phase.name} phase={phase} isFirst={index === 0} />
        ))}
      </div>
    </div>
  );
}

interface PhaseCardProps {
  phase: PhaseStatus;
  isFirst: boolean;
}

function PhaseCard({ phase, isFirst }: PhaseCardProps) {
  const statusConfig = {
    idle: {
      color: 'bg-gray-100 text-gray-600 border-gray-300',
      icon: '⏸',
      label: 'Pending',
    },
    queued: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: '⏳',
      label: 'Queued',
    },
    in_progress: {
      color: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
      icon: '⚙️',
      label: 'Running',
    },
    completed: {
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: '✓',
      label: 'Completed',
    },
    failed: {
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: '❌',
      label: 'Failed',
    },
  };

  const config = statusConfig[phase.status];

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 transition-all',
        config.color
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{config.icon}</div>
          <div>
            <div className="font-semibold">{phase.label}</div>
            <div className="text-sm opacity-80">{phase.description}</div>
          </div>
        </div>
        <div className="text-sm font-medium">{config.label}</div>
      </div>
    </div>
  );
}

function getPhaseStatus(workflow: any): PhaseStatus['status'] {
  if (!workflow.run) return 'idle';
  if (workflow.isFailed) return 'failed';
  if (workflow.isSuccess) return 'completed';
  if (workflow.isRunning) {
    return workflow.run.status === 'queued' ? 'queued' : 'in_progress';
  }
  return 'idle';
}
