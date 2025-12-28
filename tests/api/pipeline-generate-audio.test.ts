import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/pipeline/generate-audio/route';
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

describe('Pipeline Generate Audio Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/pipeline/generate-audio', () => {
    it('triggers audio workflow with default format (wav)', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/generate-audio',
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
      expect(body.format).toBe('wav');
      expect(body.startStage).toBe('audio');
    });

    it('uses m3u8 start stage when format is m3u8', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/generate-audio',
        {
          method: 'POST',
          body: JSON.stringify({
            contentId: 'test-id',
            language: 'ja-JP',
            format: 'm3u8',
          }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(body.startStage).toBe('m3u8');
      expect(body.format).toBe('m3u8');
    });

    it('uses audio start stage when format is both', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockResolvedValue(
        {} as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/generate-audio',
        {
          method: 'POST',
          body: JSON.stringify({
            contentId: 'test-id',
            language: 'en-US',
            format: 'both',
          }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(body.startStage).toBe('audio');
      expect(body.format).toBe('both');
    });

    it('returns 400 when contentId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/generate-audio',
        {
          method: 'POST',
          body: JSON.stringify({ language: 'en-US' }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 for unsupported language', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/generate-audio',
        {
          method: 'POST',
          body: JSON.stringify({
            contentId: 'test-id',
            language: 'ko-KR',
          }),
        }
      );

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Unsupported language: ko-KR');
    });

    it('handles workflow trigger errors', async () => {
      vi.mocked(GitHubWorkflowService.triggerWorkflow).mockRejectedValue(
        new Error('Audio generation failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/pipeline/generate-audio',
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
    });
  });
});
