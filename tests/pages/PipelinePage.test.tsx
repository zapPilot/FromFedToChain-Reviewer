import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PipelineHubPage from '@/app/pipeline/page';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
vi.mock('@/components/ui/sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PipelineHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for queue fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { queue: [] } }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders page title', async () => {
    render(<PipelineHubPage />);

    expect(screen.getByText('Pipeline Control Center')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    mockFetch.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<PipelineHubPage />);

    expect(screen.getByText('Loading queue...')).toBeInTheDocument();
  });

  it('shows empty queue message', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { queue: [] } }),
    });

    render(<PipelineHubPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No items pending pipeline execution.')
      ).toBeInTheDocument();
    });
  });

  it('displays queue items', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            queue: [
              {
                id: 'content-1',
                title: 'Test Content',
                status: 'reviewed',
                category: 'daily-news',
              },
            ],
          },
        }),
    });

    render(<PipelineHubPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('content-1')).toBeInTheDocument();
    });
  });

  it('shows correct button text for empty queue', async () => {
    render(<PipelineHubPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'No Pending Work' })
      ).toBeInTheDocument();
    });
  });

  it('shows process button when queue has items', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            queue: [
              { id: '1', title: 'Test', status: 'reviewed', category: 'ai' },
            ],
          },
        }),
    });

    render(<PipelineHubPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Process 1 Pending Item' })
      ).toBeInTheDocument();
    });
  });

  it('triggers pipeline on button click', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              queue: [
                { id: '1', title: 'Test', status: 'reviewed', category: 'ai' },
              ],
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Started pipeline for 1 item',
            results: [
              {
                contentId: '1',
                success: true,
                workflowsTriggered: ['pipeline-unified.yml'],
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { queue: [] } }),
      });

    render(<PipelineHubPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Process 1 Pending Item' })
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Process 1 Pending Item' })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/pipeline/run-all', {
        method: 'POST',
      });
    });
  });

  it('shows execution results after pipeline run', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              queue: [
                {
                  id: 'test-id',
                  title: 'Test',
                  status: 'reviewed',
                  category: 'ai',
                },
              ],
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: 'Pipeline complete',
            results: [
              {
                contentId: 'test-id',
                success: true,
                workflowsTriggered: ['pipeline-unified.yml'],
              },
            ],
          }),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { queue: [] } }),
      });

    render(<PipelineHubPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Process 1 Pending Item' })
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Process 1 Pending Item' })
    );

    await waitFor(() => {
      expect(screen.getByText('Execution Results')).toBeInTheDocument();
    });
  });
});
