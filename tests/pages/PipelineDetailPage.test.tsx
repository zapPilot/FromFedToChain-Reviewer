import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PipelinePage from '@/app/pipeline/[id]/page';

// Mock useParams
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-content-id' }),
}));

// Mock pipeline components
vi.mock('@/components/pipeline/PipelineStatusBoard', () => ({
  PipelineStatusBoard: ({ contentId }: { contentId: string }) => (
    <div data-testid="status-board">Status Board: {contentId}</div>
  ),
}));

vi.mock('@/components/pipeline/PipelineActionButton', () => ({
  PipelineActionButton: ({ contentId }: { contentId: string }) => (
    <button data-testid="action-button">Start Pipeline: {contentId}</button>
  ),
}));

vi.mock('@/components/pipeline/WorkflowLogViewer', () => ({
  WorkflowLogViewer: ({ workflowName }: { workflowName: string }) => (
    <div data-testid="log-viewer">Logs: {workflowName}</div>
  ),
}));

// Mock useAllWorkflowsStatus
vi.mock('@/hooks/useWorkflowStatus', () => ({
  useAllWorkflowsStatus: vi.fn(() => ({
    workflows: {
      translate: {
        run: null,
        isRunning: false,
        isSuccess: false,
        isFailed: false,
      },
      audio: { run: null, isRunning: false, isSuccess: false, isFailed: false },
      m3u8: { run: null, isRunning: false, isSuccess: false, isFailed: false },
      cloudflare: {
        run: null,
        isRunning: false,
        isSuccess: false,
        isFailed: false,
      },
      contentUpload: {
        run: null,
        isRunning: false,
        isSuccess: false,
        isFailed: false,
      },
    },
    isAnyRunning: false,
  })),
}));

describe('PipelinePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders page title', () => {
    render(<PipelinePage />, { wrapper });

    expect(screen.getByText('Pipeline Processing')).toBeInTheDocument();
  });

  it('displays content ID', () => {
    render(<PipelinePage />, { wrapper });

    expect(screen.getByText('test-content-id')).toBeInTheDocument();
  });

  it('renders PipelineStatusBoard', () => {
    render(<PipelinePage />, { wrapper });

    expect(screen.getByTestId('status-board')).toBeInTheDocument();
    expect(
      screen.getByText('Status Board: test-content-id')
    ).toBeInTheDocument();
  });

  it('renders PipelineActionButton', () => {
    render(<PipelinePage />, { wrapper });

    expect(screen.getByTestId('action-button')).toBeInTheDocument();
  });

  it('renders WorkflowLogViewer', () => {
    render(<PipelinePage />, { wrapper });

    expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
  });

  it('shows back to review link', () => {
    render(<PipelinePage />, { wrapper });

    expect(
      screen.getByRole('link', { name: '← Back to Review' })
    ).toHaveAttribute('href', '/review');
  });

  it('shows pipeline information section', () => {
    render(<PipelinePage />, { wrapper });

    expect(screen.getByText('Pipeline Information')).toBeInTheDocument();
    expect(screen.getByText('How it works:')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Phases:')).toBeInTheDocument();
  });

  it('shows running message when pipeline is active', async () => {
    const { useAllWorkflowsStatus } = await import('@/hooks/useWorkflowStatus');
    vi.mocked(useAllWorkflowsStatus).mockReturnValue({
      workflows: {
        translate: {
          run: { id: 123 },
          isRunning: true,
          isSuccess: false,
          isFailed: false,
        },
        audio: {
          run: null,
          isRunning: false,
          isSuccess: false,
          isFailed: false,
        },
        m3u8: {
          run: null,
          isRunning: false,
          isSuccess: false,
          isFailed: false,
        },
        cloudflare: {
          run: null,
          isRunning: false,
          isSuccess: false,
          isFailed: false,
        },
        contentUpload: {
          run: null,
          isRunning: false,
          isSuccess: false,
          isFailed: false,
        },
      },
      isAnyRunning: true,
      allComplete: false,
      anyFailed: false,
    } as any);

    render(<PipelinePage />, { wrapper });

    expect(
      screen.getByText(/Pipeline is currently running/)
    ).toBeInTheDocument();
  });
});
