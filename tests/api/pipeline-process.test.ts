import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/pipeline/process/route';
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
    readSource: vi.fn(),
    getAvailableLanguages: vi.fn(),
  },
}));

describe('Pipeline Process Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/pipeline/process', () => {
    it('triggers all pipeline workflows sequentially', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/process',
        {
          method: 'POST',
          body: JSON.stringify({ contentId: 'test-content-id' }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.workflows).toContain('pipeline-translate.yml');
      expect(body.workflows).toContain('pipeline-audio.yml');
      expect(body.workflows).toContain('pipeline-m3u8.yml');
      expect(body.workflows).toContain('pipeline-cloudflare.yml');
      expect(GitHubWorkflowService.triggerWorkflow).toHaveBeenCalledTimes(4);
    });

    it('returns 400 when contentId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/process',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('handles workflow trigger errors', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockRejectedValue(
        new Error('Workflow error')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/process',
        {
          method: 'POST',
          body: JSON.stringify({ contentId: 'test-id' }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/pipeline/process', () => {
    it('returns pipeline status for content', async () => {
      vi.mocked(ContentManager.readSource).mockResolvedValue({
        status: 'translated',
        updated_at: '2025-01-01T00:00:00Z',
      } as any);
      vi.mocked(ContentManager.getAvailableLanguages).mockResolvedValue([
        'en-US',
        'ja-JP',
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/process?contentId=test-id'
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.status).toBe('translated');
      expect(body.availableLanguages).toContain('en-US');
    });

    it('returns 400 when contentId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/process'
      );
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('handles content not found errors', async () => {
      vi.mocked(ContentManager.readSource).mockRejectedValue(
        new Error('Content not found')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/process?contentId=non-existent'
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });
});
