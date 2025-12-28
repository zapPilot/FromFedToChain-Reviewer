import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/layout/Header';

describe('Header', () => {
  it('renders the site title', () => {
    render(<Header />);

    expect(screen.getByText('From Fed to Chain')).toBeInTheDocument();
    expect(screen.getByText('Content Review System')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Header />);

    expect(screen.getByRole('link', { name: 'Review Queue' })).toHaveAttribute(
      'href',
      '/review'
    );
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute(
      'href',
      '/review/history'
    );
    expect(screen.getByRole('link', { name: 'Pipeline' })).toHaveAttribute(
      'href',
      '/pipeline'
    );
  });

  it('has correct styling classes', () => {
    render(<Header />);

    const header = document.querySelector('header');
    expect(header).toHaveClass('border-b', 'border-gray-200', 'bg-white');
  });

  it('renders as a header element', () => {
    render(<Header />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
