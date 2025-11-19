/**
 * Pipeline-related type definitions
 */

export type PipelinePhase =
  | 'reviewed'
  | 'translated'
  | 'wav'
  | 'm3u8'
  | 'cloudflare'
  | 'content'
  | 'social';

export type PipelineStatus =
  | 'idle'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PipelineStep {
  phase: PipelinePhase;
  status: PipelineStatus;
  workflowRunId?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface PipelineExecution {
  contentId: string;
  steps: PipelineStep[];
  currentPhase: PipelinePhase | null;
  overallStatus: PipelineStatus;
  startedAt: string;
  completedAt?: string;
}

export interface PipelineLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  phase?: PipelinePhase;
}

export interface TriggerPipelineOptions {
  contentId: string;
  startFrom?: PipelinePhase;
  languages?: string[];
}
