import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PipelineStatusBoard } from '@/components/pipeline/PipelineStatusBoard';

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

describe('PipelineStatusBoard', () => {
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

  it('renders pipeline status header', () => {
    render(<PipelineStatusBoard contentId="test-id" />, { wrapper });
    expect(screen.getByText('Pipeline Status')).toBeInTheDocument();
  });

  it('renders all pipeline phases', () => {
    render(<PipelineStatusBoard contentId="test-id" />, { wrapper });

    expect(screen.getByText('Translation')).toBeInTheDocument();
    expect(screen.getByText('Audio Generation')).toBeInTheDocument();
    expect(screen.getByText('M3U8 Conversion')).toBeInTheDocument();
    expect(screen.getByText('Cloudflare Upload')).toBeInTheDocument();
    expect(screen.getByText('Content Upload')).toBeInTheDocument();
  });

  it('shows phase descriptions', () => {
    render(<PipelineStatusBoard contentId="test-id" />, { wrapper });

    expect(
      screen.getByText('Translate content to target languages')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Generate audio with Google TTS')
    ).toBeInTheDocument();
  });

  it('shows processing indicator when running', async () => {
    const { useAllWorkflowsStatus } = await import('@/hooks/useWorkflowStatus');
    vi.mocked(useAllWorkflowsStatus).mockReturnValue({
      workflows: {
        translate: {
          run: { id: 1 },
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

    render(<PipelineStatusBoard contentId="test-id" />, { wrapper });
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('shows completed status for finished phases', async () => {
    const { useAllWorkflowsStatus } = await import('@/hooks/useWorkflowStatus');
    vi.mocked(useAllWorkflowsStatus).mockReturnValue({
      workflows: {
        translate: {
          run: { id: 1 },
          isRunning: false,
          isSuccess: true,
          isFailed: false,
        },
        audio: {
          run: { id: 2 },
          isRunning: false,
          isSuccess: true,
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
      isAnyRunning: false,
      allComplete: false,
      anyFailed: false,
    } as any);

    render(<PipelineStatusBoard contentId="test-id" />, { wrapper });
    expect(screen.getAllByText('Completed')).toHaveLength(2);
  });

  it('shows failed status for failed phases', async () => {
    const { useAllWorkflowsStatus } = await import('@/hooks/useWorkflowStatus');
    vi.mocked(useAllWorkflowsStatus).mockReturnValue({
      workflows: {
        translate: {
          run: { id: 1 },
          isRunning: false,
          isSuccess: false,
          isFailed: true,
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
      isAnyRunning: false,
      allComplete: false,
      anyFailed: true,
    } as any);

    render(<PipelineStatusBoard contentId="test-id" />, { wrapper });
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
