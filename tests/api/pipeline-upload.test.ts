import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/pipeline/upload/route';
import { GitHubWorkflowService } from '@/lib/services/GitHubWorkflowService';

// Mock services
vi.mock('@/lib/services/GitHubWorkflowService', () => ({
  GitHubWorkflowService: {
    triggerWorkflow: vi.fn(),
  },
}));

vi.mock('@/config/languages', () => ({
  isSupportedLanguage: vi.fn((lang: string) =>
    ['en-US', 'ja-JP'].includes(lang)
  ),
}));

describe('Pipeline Upload Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/pipeline/upload', () => {
    it('triggers upload workflow with valid inputs', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/upload',
        {
          method: 'POST',
          body: JSON.stringify({
            contentId: 'test-content-id',
            language: 'en-US',
          }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.workflowTriggered).toBe(true);
      expect(body.startStage).toBe('cloudflare');
      expect(GitHubWorkflowService.triggerWorkflow).toHaveBeenCalled();
    });

    it('returns 400 when contentId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/upload',
        {
          method: 'POST',
          body: JSON.stringify({ language: 'en-US' }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe(
        'Missing required parameters: contentId, language'
      );
    });

    it('returns 400 when language is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/upload',
        {
          method: 'POST',
          body: JSON.stringify({ contentId: 'test-id' }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 for unsupported language', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/upload',
        {
          method: 'POST',
          body: JSON.stringify({
            contentId: 'test-id',
            language: 'zh-CN',
          }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Unsupported language: zh-CN');
    });

    it('includes format in workflow inputs', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/upload',
        {
          method: 'POST',
          body: JSON.stringify({
            contentId: 'test-id',
            language: 'ja-JP',
            format: 'm3u8',
          }),
        }
      );

      await POST(request);

      expect(GitHubWorkflowService.triggerWorkflow).toHaveBeenCalledWith(
        'pipeline-unified.yml',
        expect.objectContaining({
          contentId: 'test-id',
          language: 'ja-JP',
          format: 'm3u8',
          start_stage: 'cloudflare',
        })
      );
    });

    it('handles workflow trigger errors', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockRejectedValue(
        new Error('Upload failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/upload',
        {
          method: 'POST',
          body: JSON.stringify({
            contentId: 'test-id',
            language: 'en-US',
          }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.details).toBe('Upload failed');
    });
  });
});
