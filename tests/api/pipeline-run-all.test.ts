import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/pipeline/run-all/route';
import { GitHubWorkflowService } from '@/lib/services/GitHubWorkflowService';
import { ContentManager } from '@/lib/ContentManager';

// Mock services
vi.mock('@/lib/services/GitHubWorkflowService', () => ({
  GitHubWorkflowService: {
    triggerWorkflow: vi.fn(),
  },
}));

vi.mock('@/lib/ContentManager', () => ({
  ContentManager: {
    getPendingPipelineItems: vi.fn(),
  },
}));

describe('Pipeline Run All Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/pipeline/run-all', () => {
    it('returns early when no pending content', async () => {
      vi.mocked(ContentManager.getPendingPipelineItems).mockResolvedValue([]);

      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(0);
      expect(body.message).toContain('No approved or in-progress content');
    });

    it('triggers unified workflow for pending items', async () => {
      const mockItems = [
        { id: 'content-1', status: 'reviewed' },
        { id: 'content-2', status: 'reviewed' },
      ];
      vi.mocked(ContentManager.getPendingPipelineItems).mockResolvedValue(
        mockItems as any
      );
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(2);
      expect(body.successful).toBe(2);
      expect(body.failed).toBe(0);
      expect(GitHubWorkflowService.triggerWorkflow).toHaveBeenCalledTimes(2);
    });

    it('tracks individual workflow failures', async () => {
      const mockItems = [
        { id: 'content-1', status: 'reviewed' },
        { id: 'content-2', status: 'reviewed' },
      ];
      vi.mocked(ContentManager.getPendingPipelineItems).mockResolvedValue(
        mockItems as any
      );
      vi.mocked(GitHubWorkflowService.triggerWorkflow)
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Workflow failed'));

      const response = await POST();
      const body = await response.json();

      expect(body.successful).toBe(1);
      expect(body.failed).toBe(1);
      expect(body.results[1].success).toBe(false);
      expect(body.results[1].error).toBe('Workflow failed');
    });

    it('calls workflow with correct inputs', async () => {
      const mockItems = [{ id: 'test-content', status: 'reviewed' }];
      vi.mocked(ContentManager.getPendingPipelineItems).mockResolvedValue(
        mockItems as any
      );
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      await POST();

      expect(GitHubWorkflowService.triggerWorkflow).toHaveBeenCalledWith(
        'pipeline-unified.yml',
        { contentId: 'test-content', start_stage: 'translate' }
      );
    });

    it('handles database errors', async () => {
      vi.mocked(ContentManager.getPendingPipelineItems).mockRejectedValue(
        new Error('Database error')
      );

      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to run pipeline for pending content');
    });
  });
});
