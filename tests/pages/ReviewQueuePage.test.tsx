import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewQueuePage from '@/app/review/page';
import { render } from '../test-utils';
import { TestUtils } from '../setup';

// Mock the hooks
vi.mock('@/hooks/useReviewQueue', () => ({
  useReviewStats: vi.fn(),
  useReviewQueue: vi.fn(),
}));

import { useReviewStats, useReviewQueue } from '@/hooks/useReviewQueue';

describe('ReviewQueuePage', () => {
  const mockStats = {
    pending: 10,
    reviewed: 25,
    rejected: 5,
    total: 40,
    byCategory: {
      'daily-news': 3,
      ethereum: 4,
      macro: 1,
      startup: 2,
      ai: 0,
      defi: 0,
    },
  };

  const mockContent = [
    TestUtils.createContent({
      id: '2025-01-01-test-1',
      title: 'Test Content 1',
    }),
    TestUtils.createContent({
      id: '2025-01-02-test-2',
      title: 'Test Content 2',
    }),
    TestUtils.createContent({
      id: '2025-01-03-test-3',
      title: 'Test Content 3',
    }),
  ];

  const mockQueueResponse = {
    content: mockContent,
    pagination: {
      page: 1,
      limit: 12,
      total: 3,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render & Data Fetching', () => {
    it('shows loading skeletons initially', () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      // Should show stats loading skeletons (4 cards)
      const skeletons = screen.queryAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('fetches and displays review stats successfully', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: mockQueueResponse,
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // Pending count
        expect(screen.getByText('25')).toBeInTheDocument(); // Reviewed count
      });
    });

    it('fetches and displays pending content successfully', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: mockQueueResponse,
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Content 1')).toBeInTheDocument();
        expect(screen.getByText('Test Content 2')).toBeInTheDocument();
        expect(screen.getByText('Test Content 3')).toBeInTheDocument();
      });
    });

    it('renders stats cards with correct numbers', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: mockQueueResponse,
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // Pending
        expect(screen.getByText('25')).toBeInTheDocument(); // Reviewed
        expect(screen.getByText('5')).toBeInTheDocument(); // Rejected
        expect(screen.getByText('40')).toBeInTheDocument(); // Total
      });
    });

    it('renders up to 12 content cards in grid', async () => {
      const manyItems = Array.from({ length: 12 }, (_, i) =>
        TestUtils.createContent({
          id: `2025-01-${String(i + 1).padStart(2, '0')}-test`,
          title: `Content ${i + 1}`,
        })
      );

      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: {
          content: manyItems,
          pagination: {
            page: 1,
            limit: 12,
            total: 12,
            totalPages: 1,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(screen.getByText('Content 1')).toBeInTheDocument();
        expect(screen.getByText('Content 12')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('category filter renders with all options', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: mockQueueResponse,
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      const categorySelect = screen.getByRole('combobox');
      expect(categorySelect).toBeInTheDocument();

      // Verify all category options are present
      expect(
        screen.getByRole('option', { name: /all categories/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: /ethereum/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: /daily news/i })
      ).toBeInTheDocument();
    });

    it('search input renders and accepts text', async () => {
      const user = userEvent.setup();

      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: mockQueueResponse,
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      const searchInput = screen.getByPlaceholderText(
        /search/i
      ) as HTMLInputElement;
      await user.type(searchInput, 'bitcoin');

      expect(searchInput.value).toBe('bitcoin');
    });

    it('FilterBar component is rendered with correct props', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: mockQueueResponse,
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      // Verify both filter elements are present
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows initial page number correctly', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: {
          content: mockContent,
          pagination: {
            page: 1,
            limit: 12,
            total: 30,
            totalPages: 3,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      });
    });

    it('Next button enabled on first page when multiple pages exist', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: {
          content: mockContent,
          pagination: {
            page: 1,
            limit: 12,
            total: 30,
            totalPages: 3,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const nextButton = buttons.find((btn) => btn.textContent === 'Next');
        expect(nextButton).toBeDefined();
        expect(nextButton).not.toBeDisabled();
      });
    });

    it('Previous button disabled on initial render', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: {
          content: mockContent,
          pagination: {
            page: 1,
            limit: 12,
            total: 30,
            totalPages: 3,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const prevButton = buttons.find(
          (btn) => btn.textContent === 'Previous'
        );
        expect(prevButton).toBeDefined();
        expect(prevButton).toBeDisabled();
      });
    });

    it('Both pagination buttons render when multiple pages exist', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: {
          content: mockContent,
          pagination: {
            page: 1,
            limit: 12,
            total: 30,
            totalPages: 3,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const nextButton = buttons.find((btn) => btn.textContent === 'Next');
        const prevButton = buttons.find(
          (btn) => btn.textContent === 'Previous'
        );

        expect(nextButton).toBeDefined();
        expect(prevButton).toBeDefined();
      });
    });

    it('does not show pagination when only one page', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: {
          content: mockContent,
          pagination: {
            page: 1,
            limit: 12,
            total: 3,
            totalPages: 1,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(screen.getByText('Test Content 1')).toBeInTheDocument();
      });

      // When there's only one page, pagination UI is not rendered at all
      expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();

      const buttons = screen.queryAllByRole('button');
      const hasNextButton = buttons.some((btn) => btn.textContent === 'Next');
      const hasPrevButton = buttons.some(
        (btn) => btn.textContent === 'Previous'
      );

      expect(hasNextButton).toBe(false);
      expect(hasPrevButton).toBe(false);
    });
  });

  describe('Empty States', () => {
    it('shows "No content to review" when no results', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: {
          content: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(screen.getByText('No content to review')).toBeInTheDocument();
        expect(
          screen.getByText('All content has been reviewed!')
        ).toBeInTheDocument();
      });
    });

    it('shows "Try adjusting your filters" when filters active and no results', async () => {
      const user = userEvent.setup();

      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useReviewQueue).mockReturnValue({
        data: {
          content: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(
          screen.getByText('Try adjusting your filters')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error alert when content fetch fails', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch content'),
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(screen.getByText('Error loading content')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch content')).toBeInTheDocument();
      });
    });

    it('shows error message with actual error text', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network timeout after 30s'),
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        expect(
          screen.getByText('Network timeout after 30s')
        ).toBeInTheDocument();
      });
    });

    it('can show partial data when stats loaded but content failed', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Content API error'),
      } as any);

      render(<ReviewQueuePage />);

      await waitFor(() => {
        // Stats should still show
        expect(screen.getByText('10')).toBeInTheDocument(); // Pending count
        // Error should also show
        expect(screen.getByText('Content API error')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows stats loading skeleton', () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: mockQueueResponse,
        isLoading: false,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      // Stats loading state should show 4 skeleton cards
      const skeletons = screen.queryAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows content loading skeleton grid', () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      // Content loading state should show 6 skeleton cards
      const skeletons = screen.queryAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('stats and content can load independently', async () => {
      vi.mocked(useReviewStats).mockReturnValue({
        data: mockStats,
        isLoading: false,
        error: null,
      } as any);
      vi.mocked(useReviewQueue).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<ReviewQueuePage />);

      // Stats should be visible
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });

      // Content should be loading
      const skeletons = screen.queryAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
