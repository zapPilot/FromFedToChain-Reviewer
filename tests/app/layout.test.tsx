import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RootLayout, { metadata } from '@/app/layout';

// Mock dependencies
vi.mock('@/app/providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

describe('RootLayout', () => {
  it('renders children within providers', () => {
    render(
      <RootLayout>
        <div>Test content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('providers')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders Header component', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('wraps content in ErrorBoundary', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('renders main element with correct classes', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const main = document.querySelector('main');
    expect(main).toHaveClass('container', 'mx-auto', 'px-4', 'py-8');
  });
});

describe('metadata', () => {
  it('has correct title', () => {
    expect(metadata.title).toBe('Content Review - From Fed to Chain');
  });

  it('has correct description', () => {
    expect(metadata.description).toBe(
      'Web-based review interface for content management'
    );
  });
});
