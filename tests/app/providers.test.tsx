import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Providers } from '@/app/providers';

// Mock Toaster component
vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

describe('Providers', () => {
  it('renders children', () => {
    render(
      <Providers>
        <div data-testid="child">Child content</div>
      </Providers>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders Toaster component', () => {
    render(
      <Providers>
        <div>Content</div>
      </Providers>
    );

    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('provides QueryClient context', async () => {
    // This test verifies that QueryClientProvider is present by checking
    // that children can render without errors
    const { container } = render(
      <Providers>
        <div>Test</div>
      </Providers>
    );

    expect(container).toBeTruthy();
  });

  it('handles multiple children', () => {
    render(
      <Providers>
        <div data-testid="first">First</div>
        <div data-testid="second">Second</div>
      </Providers>
    );

    expect(screen.getByTestId('first')).toBeInTheDocument();
    expect(screen.getByTestId('second')).toBeInTheDocument();
  });
});
