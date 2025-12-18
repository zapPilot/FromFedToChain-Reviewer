import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Octokit before any imports
const mockCreateWorkflowDispatch = vi.fn();
vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn(() => ({
      rest: {
        actions: {
          createWorkflowDispatch: mockCreateWorkflowDispatch,
        },
      },
    })),
  };
});

describe('GitHubWorkflowService', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    // Set environment variables BEFORE importing the service
    process.env = {
      ...originalEnv,
      GITHUB_TOKEN: 'test-token',
      NEXT_PUBLIC_GITHUB_OWNER: 'test-owner',
      NEXT_PUBLIC_GITHUB_REPO: 'test-repo',
    };
    mockCreateWorkflowDispatch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.resetModules(); // Reset modules after each test to ensure clean state
  });

  describe('triggerWorkflow', () => {
    it('successfully triggers workflow with valid inputs', async () => {
      mockCreateWorkflowDispatch.mockResolvedValueOnce({});

      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );
      const result = await GitHubWorkflowService.triggerWorkflow(
        'pipeline-unified.yml',
        {
          contentId: 'test-content-id',
          start_stage: 'audio',
          language: 'en',
        }
      );

      expect(result).toEqual({
        success: true,
        workflowTriggered: true,
        message: 'Workflow pipeline-unified.yml triggered successfully',
      });

      expect(mockCreateWorkflowDispatch).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        workflow_id: 'pipeline-unified.yml',
        ref: 'main',
        inputs: {
          contentId: 'test-content-id',
          start_stage: 'audio',
          language: 'en',
        },
      });
    });

    it('passes optional inputs correctly', async () => {
      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      const mockCreateWorkflowDispatch =
        mockOctokit.rest.actions.createWorkflowDispatch;

      (mockCreateWorkflowDispatch as any).mockResolvedValueOnce({});

      await GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
        contentId: 'test-id',
        start_stage: 'cloudflare',
      });

      expect(mockCreateWorkflowDispatch).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        workflow_id: 'pipeline-unified.yml',
        ref: 'main',
        inputs: {
          contentId: 'test-id',
          start_stage: 'cloudflare',
        },
      });
    });

    it('throws error when GitHub token is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );

      await expect(
        GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
        })
      ).rejects.toThrow(
        'GITHUB_TOKEN is not set. Please add it to your .env.local file.'
      );
    });

    it('throws error when repo owner is missing', async () => {
      delete process.env.NEXT_PUBLIC_GITHUB_OWNER;

      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );

      await expect(
        GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
        })
      ).rejects.toThrow(
        'NEXT_PUBLIC_GITHUB_OWNER is not set. Please add it to your .env.local file.'
      );
    });

    it('throws error when repo name is missing', async () => {
      delete process.env.NEXT_PUBLIC_GITHUB_REPO;

      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );

      await expect(
        GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
        })
      ).rejects.toThrow(
        'NEXT_PUBLIC_GITHUB_REPO is not set. Please add it to your .env.local file.'
      );
    });

    it('handles 404 Not Found error with helpful message', async () => {
      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      const mockCreateWorkflowDispatch =
        mockOctokit.rest.actions.createWorkflowDispatch;

      (mockCreateWorkflowDispatch as any).mockRejectedValueOnce({
        status: 404,
        message: 'Not Found',
      });

      await expect(
        GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
        })
      ).rejects.toThrow(
        "Workflow 'pipeline-unified.yml' not found. Ensure the workflow file exists on the 'main' branch and has been committed and pushed to GitHub."
      );
    });

    it('handles 401 Unauthorized error', async () => {
      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      const mockCreateWorkflowDispatch =
        mockOctokit.rest.actions.createWorkflowDispatch;

      (mockCreateWorkflowDispatch as any).mockRejectedValueOnce({
        status: 401,
        message: 'Bad credentials',
      });

      await expect(
        GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
        })
      ).rejects.toThrow(
        'GitHub authentication failed. Check GITHUB_TOKEN configuration in .env.local'
      );
    });

    it('handles 403 Forbidden error (rate limit)', async () => {
      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      const mockCreateWorkflowDispatch =
        mockOctokit.rest.actions.createWorkflowDispatch;

      (mockCreateWorkflowDispatch as any).mockRejectedValueOnce({
        status: 403,
        message: 'API rate limit exceeded',
      });

      await expect(
        GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
        })
      ).rejects.toThrow(
        'GitHub API rate limit exceeded or insufficient permissions. Check your token permissions.'
      );
    });

    it('handles 422 Unprocessable Entity error (invalid inputs)', async () => {
      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      const mockCreateWorkflowDispatch =
        mockOctokit.rest.actions.createWorkflowDispatch;

      (mockCreateWorkflowDispatch as any).mockRejectedValueOnce({
        status: 422,
        message: 'Validation failed: required input missing',
      });

      await expect(
        GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
        })
      ).rejects.toThrow(
        'Invalid workflow inputs. Check that all required workflow inputs are provided: Validation failed: required input missing'
      );
    });

    it('handles generic errors', async () => {
      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      const mockCreateWorkflowDispatch =
        mockOctokit.rest.actions.createWorkflowDispatch;

      (mockCreateWorkflowDispatch as any).mockRejectedValueOnce({
        message: 'Network error',
      });

      await expect(
        GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
          contentId: 'test-id',
        })
      ).rejects.toThrow('Workflow trigger failed: Network error');
    });

    it('uses main branch as ref', async () => {
      const { GitHubWorkflowService } = await import(
        '@/lib/services/GitHubWorkflowService'
      );
      const { Octokit } = await import('@octokit/rest');
      const mockOctokit = new Octokit();
      const mockCreateWorkflowDispatch =
        mockOctokit.rest.actions.createWorkflowDispatch;

      (mockCreateWorkflowDispatch as any).mockResolvedValueOnce({});

      await GitHubWorkflowService.triggerWorkflow('pipeline-unified.yml', {
        contentId: 'test-id',
      });

      expect(mockCreateWorkflowDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: 'main',
        })
      );
    });
  });
});
