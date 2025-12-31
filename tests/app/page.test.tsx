import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import Home from '@/app/page';

// Mock Next.js redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /review', () => {
    Home();

    expect(redirect).toHaveBeenCalledWith('/review');
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it('function is defined and callable', () => {
    expect(Home).toBeDefined();
    expect(typeof Home).toBe('function');
  });
});
