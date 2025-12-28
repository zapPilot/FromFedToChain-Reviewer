import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReviewHistoryPage from '@/app/review/history/page';
import { apiClient } from '@/lib/api-client';

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getReviewHistory: vi.fn(),
  },
}));

// Mock Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock ContentCard
vi.mock('@/components/review/ContentCard', () => ({
  ContentCard: ({ content }: { content: { id: string; title: string } }) => (
    <div data-testid={`content-card-${content.id}`}>{content.title}</div>
  ),
}));

describe('ReviewHistoryPage', () => {
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
    vi.mocked(apiClient.getReviewHistory).mockResolvedValue({
      content: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });

    render(<ReviewHistoryPage />, { wrapper });

    expect(screen.getByText('Review History')).toBeInTheDocument();
  });

  it('shows loading skeletons', () => {
    vi.mocked(apiClient.getReviewHistory).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ReviewHistoryPage />, { wrapper });

    expect(screen.getAllByTestId('skeleton')).toHaveLength(6);
  });

  it('shows empty state when no content', async () => {
    vi.mocked(apiClient.getReviewHistory).mockResolvedValue({
      content: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });

    render(<ReviewHistoryPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('No review history')).toBeInTheDocument();
    });
  });

  it('displays content cards', async () => {
    vi.mocked(apiClient.getReviewHistory).mockResolvedValue({
      content: [
        {
          id: '1',
          title: 'Test 1',
          feedback: { content_review: { status: 'accepted' } },
        },
        {
          id: '2',
          title: 'Test 2',
          feedback: { content_review: { status: 'rejected' } },
        },
      ] as any,
      pagination: { page: 1, limit: 12, total: 2, totalPages: 1 },
    });

    render(<ReviewHistoryPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('content-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('content-card-2')).toBeInTheDocument();
    });
  });

  it('shows accepted badge for accepted content', async () => {
    vi.mocked(apiClient.getReviewHistory).mockResolvedValue({
      content: [
        {
          id: '1',
          title: 'Test',
          feedback: { content_review: { status: 'accepted' } },
        },
      ] as any,
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    render(<ReviewHistoryPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('✓ Accepted')).toBeInTheDocument();
    });
  });

  it('shows rejected badge for rejected content', async () => {
    vi.mocked(apiClient.getReviewHistory).mockResolvedValue({
      content: [
        {
          id: '1',
          title: 'Test',
          feedback: { content_review: { status: 'rejected' } },
        },
      ] as any,
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    render(<ReviewHistoryPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('✗ Rejected')).toBeInTheDocument();
    });
  });

  it('filters by decision when selecting dropdown', async () => {
    vi.mocked(apiClient.getReviewHistory).mockResolvedValue({
      content: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });

    render(<ReviewHistoryPage />, { wrapper });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'accepted' } });

    await waitFor(() => {
      expect(apiClient.getReviewHistory).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'accepted' })
      );
    });
  });

  it('shows pagination when multiple pages', async () => {
    vi.mocked(apiClient.getReviewHistory).mockResolvedValue({
      content: [{ id: '1', title: 'Test', feedback: null }] as any,
      pagination: { page: 1, limit: 12, total: 30, totalPages: 3 },
    });

    render(<ReviewHistoryPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    });
  });
});
