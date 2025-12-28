import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/pipeline/translate/route';
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
    getSourceByStatus: vi.fn(),
  },
}));

describe('Pipeline Translate Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/pipeline/translate', () => {
    it('triggers translation workflow with contentId', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue({
        status: 204,
      } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/translate',
        {
          method: 'POST',
          body: JSON.stringify({ contentId: 'test-content-id' }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.workflowTriggered).toBe(true);
      expect(body.workflow).toBe('pipeline-translate.yml');
      expect(GitHubWorkflowService.triggerWorkflow).toHaveBeenCalledWith(
        'pipeline-translate.yml',
        { contentId: 'test-content-id' }
      );
    });

    it('includes targetLanguage in workflow inputs when provided', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/translate',
        {
          method: 'POST',
          body: JSON.stringify({
            contentId: 'test-id',
            targetLanguage: 'ja-JP',
          }),
        }
      );

      await POST(request);

      expect(GitHubWorkflowService.triggerWorkflow).toHaveBeenCalledWith(
        'pipeline-translate.yml',
        { contentId: 'test-id', targetLanguage: 'ja-JP' }
      );
    });

    it('returns 400 when contentId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/translate',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Missing required parameter: contentId');
    });

    it('handles workflow trigger errors', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockRejectedValue(
        new Error('GitHub API error')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/translate',
        {
          method: 'POST',
          body: JSON.stringify({ contentId: 'test-id' }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.details).toBe('GitHub API error');
    });
  });

  describe('GET /api/pipeline/translate', () => {
    it('returns content needing translation', async () => {
      const mockContent = [
        { id: 'content-1', title: 'Test 1', status: 'reviewed' },
        { id: 'content-2', title: 'Test 2', status: 'reviewed' },
      ];
      vi.mocked(ContentManager.getSourceByStatus).mockResolvedValue(
        mockContent as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/translate'
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(ContentManager.getSourceByStatus).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/translate'
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to get content needing translation');
    });
  });
});
