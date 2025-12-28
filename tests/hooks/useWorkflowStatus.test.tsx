import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { WorkflowRun } from '@/lib/github-client';

// Mock the GitHub client with inline mock implementations
vi.mock('@/lib/github-client', () => ({
  githubClient: {
    getWorkflowRuns: vi.fn(),
    isConfigured: vi.fn(),
  },
  WORKFLOWS: {
    UNIFIED: 'pipeline-unified.yml',
    TRANSLATE: 'pipeline-translate.yml',
    AUDIO: 'pipeline-audio.yml',
    M3U8: 'pipeline-m3u8.yml',
    CLOUDFLARE: 'pipeline-cloudflare.yml',
    CONTENT_UPLOAD: 'pipeline-content-upload.yml',
  },
}));

// Import after mocking
import {
  useWorkflowStatus,
  useAllWorkflowsStatus,
} from '@/hooks/useWorkflowStatus';
import { githubClient } from '@/lib/github-client';

// Type the mocked functions
const mockedGetWorkflowRuns = vi.mocked(githubClient.getWorkflowRuns);
const mockedIsConfigured = vi.mocked(githubClient.isConfigured);

describe('useWorkflowStatus', () => {
  let queryClient: QueryClient;

  const createMockRun = (
    overrides: Partial<WorkflowRun> = {}
  ): WorkflowRun => ({
    id: 12345,
    name: 'Test Workflow',
    status: 'completed',
    conclusion: 'success',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:05:00Z',
    html_url: 'https://github.com/owner/repo/actions/runs/12345',
    run_started_at: '2025-01-01T10:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Data Fetching', () => {
    it('fetches workflow runs when enabled and configured', async () => {
      const mockRun = createMockRun();
      mockedIsConfigured.mockReturnValue(true);
      mockedGetWorkflowRuns.mockResolvedValue([mockRun]);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content',
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockedGetWorkflowRuns).toHaveBeenCalledWith(
        'pipeline-unified.yml',
        20
      );
      expect(result.current.run).toEqual(mockRun);
    });

    it('returns null run when no workflow runs exist', async () => {
      mockedIsConfigured.mockReturnValue(true);
      mockedGetWorkflowRuns.mockResolvedValue([]);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content-empty-runs',
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());

      expect(result.current.run).toBeNull();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.isComplete).toBe(false);
    });

    it('does not fetch when not configured', async () => {
      mockedIsConfigured.mockReturnValue(false);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content',
          }),
        { wrapper }
      );

      // Query should not be enabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPending).toBe(true);
      expect(mockedGetWorkflowRuns).not.toHaveBeenCalled();
    });

    it('does not fetch when disabled', async () => {
      mockedIsConfigured.mockReturnValue(true);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content',
            enabled: false,
          }),
        { wrapper }
      );

      expect(result.current.isPending).toBe(true);
      expect(mockedGetWorkflowRuns).not.toHaveBeenCalled();
    });
  });

  describe('Status Derivation', () => {
    it('correctly identifies running workflow (in_progress)', async () => {
      const mockRun = createMockRun({
        status: 'in_progress',
        conclusion: null,
      });
      mockedIsConfigured.mockReturnValue(true);
      mockedGetWorkflowRuns.mockResolvedValue([mockRun]);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content',
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());

      expect(result.current.isRunning).toBe(true);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.isFailed).toBe(false);
    });

    it('correctly identifies queued workflow', async () => {
      const mockRun = createMockRun({ status: 'queued', conclusion: null });
      mockedIsConfigured.mockReturnValue(true);
      mockedGetWorkflowRuns.mockResolvedValue([mockRun]);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content',
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());

      expect(result.current.isRunning).toBe(true);
      expect(result.current.isComplete).toBe(false);
    });

    it('correctly identifies successful workflow', async () => {
      const mockRun = createMockRun({
        status: 'completed',
        conclusion: 'success',
      });
      mockedIsConfigured.mockReturnValue(true);
      mockedGetWorkflowRuns.mockResolvedValue([mockRun]);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content',
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.data?.isSuccess).toBe(true);
      expect(result.current.isFailed).toBe(false);
    });

    it('correctly identifies failed workflow', async () => {
      const mockRun = createMockRun({
        status: 'completed',
        conclusion: 'failure',
      });
      mockedIsConfigured.mockReturnValue(true);
      mockedGetWorkflowRuns.mockResolvedValue([mockRun]);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content',
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.data).toBeDefined());

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.data?.isSuccess).toBe(false);
      expect(result.current.isFailed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('calls getWorkflowRuns and handles rejection', async () => {
      mockedIsConfigured.mockReturnValue(true);
      const error = new Error('GitHub API error');
      mockedGetWorkflowRuns.mockRejectedValue(error);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content-error-case',
          }),
        { wrapper }
      );

      // The hook starts in loading state
      expect(result.current.isLoading).toBe(true);

      // Verify the mock was called
      await waitFor(() => expect(mockedGetWorkflowRuns).toHaveBeenCalled());

      expect(mockedGetWorkflowRuns).toHaveBeenCalledWith(
        'pipeline-unified.yml',
        20
      );
    });
  });

  describe('Default Values', () => {
    it('returns false for all status flags when no data', () => {
      mockedIsConfigured.mockReturnValue(false);

      const { result } = renderHook(
        () =>
          useWorkflowStatus({
            workflowFile: 'pipeline-unified.yml',
            contentId: 'test-content',
          }),
        { wrapper }
      );

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.isFailed).toBe(false);
    });
  });
});

describe('useAllWorkflowsStatus', () => {
  let queryClient: QueryClient;

  const createMockRun = (
    overrides: Partial<WorkflowRun> = {}
  ): WorkflowRun => ({
    id: 12345,
    name: 'Test Workflow',
    status: 'completed',
    conclusion: 'success',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:05:00Z',
    html_url: 'https://github.com/owner/repo/actions/runs/12345',
    run_started_at: '2025-01-01T10:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('aggregates status from all workflows', async () => {
    mockedIsConfigured.mockReturnValue(true);
    mockedGetWorkflowRuns.mockResolvedValue([
      createMockRun({ status: 'completed', conclusion: 'success' }),
    ]);

    const { result } = renderHook(
      () => useAllWorkflowsStatus({ contentId: 'test-content' }),
      { wrapper }
    );

    await waitFor(() =>
      expect(result.current.workflows.translate.data).toBeDefined()
    );

    expect(result.current.workflows.translate).toBeDefined();
    expect(result.current.workflows.audio).toBeDefined();
    expect(result.current.workflows.m3u8).toBeDefined();
    expect(result.current.workflows.cloudflare).toBeDefined();
    expect(result.current.workflows.contentUpload).toBeDefined();
  });

  it('correctly identifies when any workflow is running', async () => {
    mockedIsConfigured.mockReturnValue(true);
    mockedGetWorkflowRuns.mockResolvedValue([
      createMockRun({ status: 'in_progress', conclusion: null }),
    ]);

    const { result } = renderHook(
      () => useAllWorkflowsStatus({ contentId: 'test-content' }),
      { wrapper }
    );

    await waitFor(() =>
      expect(result.current.workflows.translate.data).toBeDefined()
    );

    expect(result.current.isAnyRunning).toBe(true);
  });

  it('correctly identifies when all workflows complete', async () => {
    mockedIsConfigured.mockReturnValue(true);
    mockedGetWorkflowRuns.mockResolvedValue([
      createMockRun({ status: 'completed', conclusion: 'success' }),
    ]);

    const { result } = renderHook(
      () => useAllWorkflowsStatus({ contentId: 'test-content' }),
      { wrapper }
    );

    await waitFor(() =>
      expect(result.current.workflows.translate.data).toBeDefined()
    );

    expect(result.current.allComplete).toBe(true);
  });

  it('correctly identifies when any workflow fails', async () => {
    mockedIsConfigured.mockReturnValue(true);
    mockedGetWorkflowRuns.mockResolvedValue([
      createMockRun({ status: 'completed', conclusion: 'failure' }),
    ]);

    const { result } = renderHook(
      () => useAllWorkflowsStatus({ contentId: 'test-content' }),
      { wrapper }
    );

    await waitFor(() =>
      expect(result.current.workflows.translate.data).toBeDefined()
    );

    expect(result.current.anyFailed).toBe(true);
  });

  it('respects enabled flag', () => {
    mockedIsConfigured.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useAllWorkflowsStatus({ contentId: 'test-content', enabled: false }),
      { wrapper }
    );

    expect(mockedGetWorkflowRuns).not.toHaveBeenCalled();
    expect(result.current.isAnyRunning).toBe(false);
  });
});
