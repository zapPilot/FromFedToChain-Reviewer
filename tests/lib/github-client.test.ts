import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('github-client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_GITHUB_TOKEN: 'test-token',
      NEXT_PUBLIC_GITHUB_OWNER: 'test-owner',
      NEXT_PUBLIC_GITHUB_REPO: 'test-repo',
    };
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('WORKFLOWS constant', () => {
    it('exports all workflow file names', async () => {
      const { WORKFLOWS } = await import('@/lib/github-client');

      expect(WORKFLOWS.UNIFIED).toBe('pipeline-unified.yml');
      expect(WORKFLOWS.TRANSLATE).toBe('pipeline-translate.yml');
      expect(WORKFLOWS.AUDIO).toBe('pipeline-audio.yml');
      expect(WORKFLOWS.M3U8).toBe('pipeline-m3u8.yml');
      expect(WORKFLOWS.CLOUDFLARE).toBe('pipeline-cloudflare.yml');
      expect(WORKFLOWS.CONTENT_UPLOAD).toBe('pipeline-content-upload.yml');
    });
  });

  describe('GitHubClient', () => {
    describe('isConfigured', () => {
      it('returns true when token and owner are set', async () => {
        const { githubClient } = await import('@/lib/github-client');
        expect(githubClient.isConfigured()).toBe(true);
      });

      it('returns false when owner is default placeholder', async () => {
        process.env.NEXT_PUBLIC_GITHUB_OWNER = 'YOUR_GITHUB_USERNAME';
        vi.resetModules();

        const { githubClient } = await import('@/lib/github-client');
        expect(githubClient.isConfigured()).toBe(false);
      });
    });

    describe('getWorkflowRuns', () => {
      it('fetches workflow runs with correct endpoint', async () => {
        const mockRuns = [
          {
            id: 123,
            name: 'Test',
            status: 'completed',
            conclusion: 'success',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            html_url: 'https://github.com/test',
            run_started_at: null,
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ workflow_runs: mockRuns }),
        });

        const { githubClient } = await import('@/lib/github-client');
        const runs = await githubClient.getWorkflowRuns(
          'pipeline-unified.yml',
          10
        );

        expect(runs).toEqual(mockRuns);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('pipeline-unified.yml'),
          expect.any(Object)
        );
      });

      it('handles API errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          statusText: 'Not Found',
          json: () => Promise.resolve({ message: 'Not Found' }),
        });

        const { githubClient } = await import('@/lib/github-client');

        await expect(
          githubClient.getWorkflowRuns('pipeline-unified.yml')
        ).rejects.toThrow('GitHub API error');
      });
    });

    describe('getWorkflowRun', () => {
      it('fetches a single workflow run by ID', async () => {
        const mockRun = {
          id: 456,
          name: 'Test Run',
          status: 'completed',
          conclusion: 'success',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/test/456',
          run_started_at: null,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRun),
        });

        const { githubClient } = await import('@/lib/github-client');
        const run = await githubClient.getWorkflowRun(456);

        expect(run).toEqual(mockRun);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/runs/456'),
          expect.any(Object)
        );
      });
    });

    describe('getLatestRunForContent', () => {
      it('returns the most recent run', async () => {
        const mockRuns = [
          { id: 1, name: 'Latest' },
          { id: 2, name: 'Older' },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ workflow_runs: mockRuns }),
        });

        const { githubClient } = await import('@/lib/github-client');
        const run = await githubClient.getLatestRunForContent(
          'pipeline-unified.yml',
          'test-content-id'
        );

        expect(run).toEqual(mockRuns[0]);
      });

      it('returns null when no runs exist', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ workflow_runs: [] }),
        });

        const { githubClient } = await import('@/lib/github-client');
        const run = await githubClient.getLatestRunForContent(
          'pipeline-unified.yml',
          'test-content-id'
        );

        expect(run).toBeNull();
      });
    });

    describe('triggerWorkflow', () => {
      it('triggers workflow with correct inputs', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const { githubClient } = await import('@/lib/github-client');
        await githubClient.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
          language: 'en-US',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('dispatches'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    describe('cancelWorkflowRun', () => {
      it('cancels a running workflow', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const { githubClient } = await import('@/lib/github-client');
        await githubClient.cancelWorkflowRun(123);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/runs/123/cancel'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('readFileContent', () => {
      it('reads and decodes base64 file content', async () => {
        const content = 'Hello World';
        const base64 = btoa(content);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              content: base64,
              encoding: 'base64',
            }),
        });

        const { githubClient } = await import('@/lib/github-client');
        const result = await githubClient.readFileContent(
          'content/test.json',
          'main'
        );

        expect(result).toBe(content);
      });
    });

    describe('listDirectory', () => {
      it('lists directory contents', async () => {
        const mockFiles = [
          { name: 'file1.json', path: 'content/file1.json', type: 'file' },
          { name: 'subdir', path: 'content/subdir', type: 'dir' },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFiles),
        });

        const { githubClient } = await import('@/lib/github-client');
        const result = await githubClient.listDirectory('content');

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('file1.json');
        expect(result[0].type).toBe('file');
        expect(result[1].type).toBe('dir');
      });
    });

    describe('triggerFullPipeline', () => {
      it('triggers unified workflow with translate stage', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const { githubClient } = await import('@/lib/github-client');
        await githubClient.triggerFullPipeline({
          contentId: 'test-id',
        });

        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });
});
