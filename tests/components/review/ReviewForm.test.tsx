import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewForm } from '@/components/review/ReviewForm';
import { render } from '../../test-utils';
import { TestUtils } from '../../setup';

describe('ReviewForm', () => {
  const mockContent = TestUtils.createContent({
    category: 'ethereum',
  });
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all form elements', () => {
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Review Decision')).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/accept/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reject/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/feedback/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /submit review/i })
      ).toBeInTheDocument();
    });

    it('renders with default category selected', () => {
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(
        /category/i
      ) as HTMLSelectElement;
      expect(categorySelect.value).toBe('ethereum');
    });

    it('shows both Accept and Reject radio buttons', () => {
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const acceptRadio = screen.getByLabelText(/accept/i) as HTMLInputElement;
      const rejectRadio = screen.getByLabelText(/reject/i) as HTMLInputElement;

      expect(acceptRadio).toBeInTheDocument();
      expect(rejectRadio).toBeInTheDocument();
      expect(acceptRadio.type).toBe('radio');
      expect(rejectRadio.type).toBe('radio');
    });

    it('displays feedback textarea', () => {
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const feedback = screen.getByLabelText(/feedback/i);
      expect(feedback).toBeInTheDocument();
      expect(feedback.tagName).toBe('TEXTAREA');
    });

    it('shows all 6 categories in dropdown', () => {
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(
        /category/i
      ) as HTMLSelectElement;
      const options = Array.from(categorySelect.options);

      expect(options).toHaveLength(6);
      const categoryValues = options.map((opt) => opt.value);

      // Check that all expected categories are present (order may vary)
      expect(categoryValues).toContain('daily-news');
      expect(categoryValues).toContain('ethereum');
      expect(categoryValues).toContain('defi');
      expect(categoryValues).toContain('ai');
      expect(categoryValues).toContain('macro');
      expect(categoryValues).toContain('startup');
    });
  });

  describe('Form Validation', () => {
    it('allows submission when action is selected', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const acceptRadio = screen.getByLabelText(/accept/i);
      await user.click(acceptRadio);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('feedback is optional when accepting', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      await user.click(screen.getByLabelText(/accept/i));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const callArgs = mockOnSubmit.mock.calls[0];
      expect(callArgs[0]).toEqual({
        action: 'accept',
        feedback: '',
        newCategory: 'ethereum',
      });
    });

    it('allows category to be changed', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(/category/i);
      await user.selectOptions(categorySelect, 'defi');

      await user.click(screen.getByLabelText(/accept/i));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const callArgs = mockOnSubmit.mock.calls[0];
      expect(callArgs[0]).toEqual({
        action: 'accept',
        feedback: '',
        newCategory: 'defi',
      });
    });

    it('shows required indicator for feedback when rejecting', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      await user.click(screen.getByLabelText(/reject/i));

      // Check that the asterisk appears
      const feedbackLabel = screen.getByText(/feedback/i);
      expect(feedbackLabel.textContent).toContain('*');
    });
  });

  describe('User Interactions', () => {
    it('selecting Accept enables form submission', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const acceptRadio = screen.getByLabelText(/accept/i);
      await user.click(acceptRadio);

      expect(acceptRadio).toBeChecked();
    });

    it('selecting Reject enables form submission', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const rejectRadio = screen.getByLabelText(/reject/i);
      await user.click(rejectRadio);

      expect(rejectRadio).toBeChecked();
    });

    it('typing feedback updates form state', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const feedbackTextarea = screen.getByLabelText(
        /feedback/i
      ) as HTMLTextAreaElement;
      await user.type(feedbackTextarea, 'This is great content!');

      expect(feedbackTextarea.value).toBe('This is great content!');
    });

    it('changing category updates form state', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(
        /category/i
      ) as HTMLSelectElement;
      await user.selectOptions(categorySelect, 'ai');

      expect(categorySelect.value).toBe('ai');
    });

    it('submit calls onSubmit with correct data for accept', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      await user.click(screen.getByLabelText(/accept/i));
      await user.type(screen.getByLabelText(/feedback/i), 'Looks good to me');
      await user.selectOptions(screen.getByLabelText(/category/i), 'defi');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const callArgs = mockOnSubmit.mock.calls[0];
      expect(callArgs[0]).toEqual({
        action: 'accept',
        feedback: 'Looks good to me',
        newCategory: 'defi',
      });
    });

    it('submit calls onSubmit with correct data for reject', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      await user.click(screen.getByLabelText(/reject/i));
      await user.type(
        screen.getByLabelText(/feedback/i),
        'Content quality is low'
      );
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      const callArgs = mockOnSubmit.mock.calls[0];
      expect(callArgs[0]).toEqual({
        action: 'reject',
        feedback: 'Content quality is low',
        newCategory: 'ethereum',
      });
    });

    it('updates placeholder text based on action', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const feedbackTextarea = screen.getByLabelText(/feedback/i);

      // Initially no action selected
      expect(feedbackTextarea).toHaveAttribute(
        'placeholder',
        'Optional feedback or comments'
      );

      // Select reject
      await user.click(screen.getByLabelText(/reject/i));
      expect(feedbackTextarea).toHaveAttribute(
        'placeholder',
        'Please provide feedback (required for rejection)'
      );

      // Switch to accept
      await user.click(screen.getByLabelText(/accept/i));
      expect(feedbackTextarea).toHaveAttribute(
        'placeholder',
        'Optional feedback or comments'
      );
    });
  });

  describe('Loading States', () => {
    it('submit button shows loading state when isSubmitting=true', () => {
      render(
        <ReviewForm
          content={mockContent}
          onSubmit={mockOnSubmit}
          isSubmitting={true}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /submitting/i,
      });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('submit button is enabled when not submitting', () => {
      render(
        <ReviewForm
          content={mockContent}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /submit review/i,
      });
      expect(submitButton).not.toBeDisabled();
    });

    it('cannot double-submit when isSubmitting is true', async () => {
      const user = userEvent.setup();
      render(
        <ReviewForm
          content={mockContent}
          onSubmit={mockOnSubmit}
          isSubmitting={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /submitting/i });
      expect(submitButton).toBeDisabled();

      // Attempt to click (should not work)
      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('changes button variant based on action', async () => {
      const user = userEvent.setup();
      render(<ReviewForm content={mockContent} onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Select accept - default variant
      await user.click(screen.getByLabelText(/accept/i));
      expect(submitButton).toHaveClass('bg-blue-600'); // Default variant

      // Select reject - destructive variant
      await user.click(screen.getByLabelText(/reject/i));
      expect(submitButton).toHaveClass('bg-red-600'); // Destructive variant
    });
  });

  describe('Different Content Categories', () => {
    it('renders correctly with daily-news category', () => {
      const dailyNewsContent = TestUtils.createContent({
        category: 'daily-news',
      });
      render(<ReviewForm content={dailyNewsContent} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(
        /category/i
      ) as HTMLSelectElement;
      expect(categorySelect.value).toBe('daily-news');
    });

    it('renders correctly with ai category', () => {
      const aiContent = TestUtils.createContent({
        category: 'ai',
      });
      render(<ReviewForm content={aiContent} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(
        /category/i
      ) as HTMLSelectElement;
      expect(categorySelect.value).toBe('ai');
    });

    it('renders correctly with macro category', () => {
      const macroContent = TestUtils.createContent({
        category: 'macro',
      });
      render(<ReviewForm content={macroContent} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(
        /category/i
      ) as HTMLSelectElement;
      expect(categorySelect.value).toBe('macro');
    });
  });
});
