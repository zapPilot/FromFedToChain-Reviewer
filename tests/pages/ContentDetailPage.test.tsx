import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentDetailPage from '@/app/review/[id]/page';
import { render } from '../test-utils';
import { TestUtils } from '../setup';

// Mock the hooks
vi.mock('@/hooks/useContentDetail', () => ({
  useContentDetail: vi.fn(),
  useReviewSubmit: vi.fn(),
}));

// Mock Next.js navigation
const mockPush = vi.fn();
const mockParams = { id: '2025-01-01-test-content' };

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

import { useContentDetail, useReviewSubmit } from '@/hooks/useContentDetail';

describe('ContentDetailPage', () => {
  const mockContent = TestUtils.createContent({
    id: '2025-01-01-test-content',
    title: 'Test Article',
    category: 'ethereum',
  });

  const mockNavigation = {
    previous: '2024-12-31-prev',
    next: '2025-01-02-next',
  };

  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();

    // Default mock for reviewMutation
    vi.mocked(useReviewSubmit).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    } as any);
  });

  describe('Content Loading & Display', () => {
    it('shows loading skeleton initially', () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('fetches content by ID from params', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(useContentDetail).toHaveBeenCalledWith(
          '2025-01-01-test-content'
        );
      });
    });

    it('displays content when loaded successfully', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });
    });

    it('renders ContentDisplay component', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        // ContentDisplay should show the title
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });
    });

    it('renders ReviewForm component with correct props', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Review Decision')).toBeInTheDocument();
      });
    });

    it('shows keyboard shortcuts hint', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Use ← → arrow keys to navigate/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('NavigationButtons', () => {
    it('renders NavigationButtons component', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        // NavigationButtons should render Previous and Next buttons
        const buttons = screen.getAllByRole('button');
        const hasPrevButton = buttons.some(
          (btn) =>
            btn.textContent?.includes('Previous') ||
            btn.textContent?.includes('←')
        );
        const hasNextButton = buttons.some(
          (btn) =>
            btn.textContent?.includes('Next') || btn.textContent?.includes('→')
        );

        expect(hasPrevButton || hasNextButton).toBe(true);
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('ArrowLeft navigates to previous content', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      // Wait for useEffect to attach event listener
      await new Promise((resolve) => setTimeout(resolve, 10));

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/review/2024-12-31-prev');
      });
    });

    it('ArrowRight navigates to next content', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      // Wait for useEffect to attach event listener
      await new Promise((resolve) => setTimeout(resolve, 10));

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/review/2025-01-02-next');
      });
    });

    it('does not navigate when no previous content exists', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: {
            previous: null,
            next: '2025-01-02-next',
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not navigate when no next content exists', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: {
            previous: '2024-12-31-prev',
            next: null,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not trigger keyboard navigation when focused in input', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      const feedbackTextarea = screen.getByLabelText(/feedback/i);
      feedbackTextarea.focus();

      fireEvent.keyDown(feedbackTextarea, { key: 'ArrowLeft' });
      fireEvent.keyDown(feedbackTextarea, { key: 'ArrowRight' });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Review Form Integration', () => {
    it('passes content to ReviewForm', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        // ReviewForm should show the category from content
        const categorySelect = screen.getByLabelText(/category/i);
        expect((categorySelect as HTMLSelectElement).value).toBe('ethereum');
      });
    });

    it('shows submitting state in form button', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useReviewSubmit).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isSuccess: false,
        isError: false,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /submitting/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Post-Submission Navigation', () => {
    it('navigates to next content after successful review', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });

      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      const user = userEvent.setup();
      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      const acceptRadio = screen.getByLabelText(/accept/i);
      await user.click(acceptRadio);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: '2025-01-01-test-content',
          data: {
            action: 'accept',
            feedback: '',
            newCategory: 'ethereum',
          },
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/review/2025-01-02-next');
      });
    });

    it('navigates to queue when no next content exists', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });

      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: {
            previous: '2024-12-31-prev',
            next: null,
          },
        },
        isLoading: false,
        error: null,
      } as any);

      const user = userEvent.setup();
      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      const acceptRadio = screen.getByLabelText(/accept/i);
      await user.click(acceptRadio);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/review');
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when content not found', async () => {
      const mockError = new Error('Content not found');
      vi.mocked(useContentDetail).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Content Not Found')).toBeInTheDocument();
        expect(screen.getByText('Content not found')).toBeInTheDocument();
      });
    });

    it('shows "Back to Review Queue" link on error', async () => {
      const mockError = new Error('Network error');
      vi.mocked(useContentDetail).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      const user = userEvent.setup();
      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Back to Review Queue')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Back to Review Queue'));

      expect(mockPush).toHaveBeenCalledWith('/review');
    });

    it('handles network errors during fetch', async () => {
      const mockError = new Error('Network request failed');
      vi.mocked(useContentDetail).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Network request failed')).toBeInTheDocument();
      });
    });

    it('shows alert on submission error', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const mockError = new Error('Validation failed');
      mockMutateAsync.mockRejectedValue(mockError);

      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      const user = userEvent.setup();
      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      const rejectRadio = screen.getByLabelText(/reject/i);
      await user.click(rejectRadio);

      const feedbackTextarea = screen.getByLabelText(/feedback/i);
      await user.type(feedbackTextarea, 'Test feedback');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error: Validation failed');
      });

      alertSpy.mockRestore();
    });

    it('does not navigate on submission error', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockMutateAsync.mockRejectedValue(new Error('Server error'));

      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      const user = userEvent.setup();
      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      const acceptRadio = screen.getByLabelText(/accept/i);
      await user.click(acceptRadio);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Should NOT navigate on error
      expect(mockPush).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('shows skeleton during content fetch', () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      // Check for skeleton class
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('hides skeleton after content loads', async () => {
      vi.mocked(useContentDetail).mockReturnValue({
        data: {
          content: mockContent,
          navigation: mockNavigation,
        },
        isLoading: false,
        error: null,
      } as any);

      render(<ContentDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });

      // Should not have loading skeleton
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(0);
    });
  });
});
