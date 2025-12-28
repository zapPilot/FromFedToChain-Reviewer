import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowLogViewer } from '@/components/pipeline/WorkflowLogViewer';

// Mock github-client
vi.mock('@/lib/github-client', () => ({
  githubClient: {
    getWorkflowLogs: vi.fn(),
  },
}));

describe('WorkflowLogViewer', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('shows no active workflow message when runId is null', () => {
    render(<WorkflowLogViewer runId={null} workflowName="translate" />, {
      wrapper,
    });

    expect(screen.getByText('Workflow Logs')).toBeInTheDocument();
    expect(
      screen.getByText('No active workflow. Start the pipeline to see logs.')
    ).toBeInTheDocument();
  });

  it('shows workflow name in header when runId exists', () => {
    render(<WorkflowLogViewer runId={123} workflowName="translate" />, {
      wrapper,
    });

    expect(screen.getByText('Workflow Logs - translate')).toBeInTheDocument();
  });

  it('shows Show Logs button when runId exists', () => {
    render(<WorkflowLogViewer runId={123} workflowName="audio" />, { wrapper });

    expect(
      screen.getByRole('button', { name: 'Show Logs' })
    ).toBeInTheDocument();
  });

  it('toggles expanded state when button is clicked', () => {
    render(<WorkflowLogViewer runId={123} workflowName="m3u8" />, { wrapper });

    const button = screen.getByRole('button', { name: 'Show Logs' });
    fireEvent.click(button);

    expect(
      screen.getByRole('button', { name: 'Hide Logs' })
    ).toBeInTheDocument();
  });

  it('shows loading state when fetching logs', async () => {
    const { githubClient } = await import('@/lib/github-client');
    vi.mocked(githubClient.getWorkflowLogs).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<WorkflowLogViewer runId={456} workflowName="cloudflare" />, {
      wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show Logs' }));

    // Loading spinner should appear
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows download button when logs are available', async () => {
    const { githubClient } = await import('@/lib/github-client');
    vi.mocked(githubClient.getWorkflowLogs).mockResolvedValue(
      'https://github.com/logs/123'
    );

    render(<WorkflowLogViewer runId={789} workflowName="content" />, {
      wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show Logs' }));

    // Wait for the download button to appear
    await screen.findByRole('button', { name: /Download Logs/i });
    expect(
      screen.getByText(
        'Logs are available as a downloadable archive from GitHub.'
      )
    ).toBeInTheDocument();
  });

  it('shows not available message when logs are null', async () => {
    const { githubClient } = await import('@/lib/github-client');
    vi.mocked(githubClient.getWorkflowLogs).mockResolvedValue(null as any);

    render(<WorkflowLogViewer runId={111} workflowName="upload" />, {
      wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show Logs' }));

    await screen.findByText(
      'Logs not available yet. They may still be processing.'
    );
  });
});
