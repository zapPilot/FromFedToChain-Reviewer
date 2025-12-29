/**
 * Shared GitHub Types
 */

// Workflow file names in .github/workflows/
export const WORKFLOWS = {
  UNIFIED: 'pipeline-unified.yml', // New unified workflow with all stages
  TRANSLATE: 'pipeline-translate.yml',
  AUDIO: 'pipeline-audio.yml',
  M3U8: 'pipeline-m3u8.yml',
  CLOUDFLARE: 'pipeline-cloudflare.yml',
} as const;

export type WorkflowName = (typeof WORKFLOWS)[keyof typeof WORKFLOWS];

export interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_started_at: string | null;
}

export interface WorkflowLog {
  content: string;
}

export interface TriggerWorkflowParams {
  contentId: string;
  language?: string;
  category?: string;
  start_stage?: string;
}
