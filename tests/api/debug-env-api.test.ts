import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/debug/env/route';

describe('GET /api/debug/env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set up test environment variables
    process.env.GITHUB_TOKEN = 'test-token-1234567890abcdef';
    process.env.NEXT_PUBLIC_GITHUB_OWNER = 'test-owner';
    process.env.NEXT_PUBLIC_GITHUB_REPO = 'test-repo';
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('returns environment variables in JSON format', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
  });

  it('returns GITHUB_TOKEN with first 10 characters only', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.GITHUB_TOKEN).toBe('test-token...');
    expect(body.GITHUB_TOKEN).toContain('...');
    expect(body.GITHUB_TOKEN.length).toBeLessThan(20); // Truncated
  });

  it('returns NEXT_PUBLIC_GITHUB_OWNER', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.NEXT_PUBLIC_GITHUB_OWNER).toBe('test-owner');
  });

  it('returns NEXT_PUBLIC_GITHUB_REPO', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.NEXT_PUBLIC_GITHUB_REPO).toBe('test-repo');
  });

  it('returns "NOT SET" when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN;

    const response = await GET();
    const body = await response.json();

    expect(body.GITHUB_TOKEN).toBe('NOT SET');
  });

  it('returns "NOT SET" when NEXT_PUBLIC_GITHUB_OWNER is missing', async () => {
    delete process.env.NEXT_PUBLIC_GITHUB_OWNER;

    const response = await GET();
    const body = await response.json();

    expect(body.NEXT_PUBLIC_GITHUB_OWNER).toBe('NOT SET');
  });

  it('returns "NOT SET" when NEXT_PUBLIC_GITHUB_REPO is missing', async () => {
    delete process.env.NEXT_PUBLIC_GITHUB_REPO;

    const response = await GET();
    const body = await response.json();

    expect(body.NEXT_PUBLIC_GITHUB_REPO).toBe('NOT SET');
  });

  it('handles all environment variables missing', async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.NEXT_PUBLIC_GITHUB_OWNER;
    delete process.env.NEXT_PUBLIC_GITHUB_REPO;

    const response = await GET();
    const body = await response.json();

    expect(body.GITHUB_TOKEN).toBe('NOT SET');
    expect(body.NEXT_PUBLIC_GITHUB_OWNER).toBe('NOT SET');
    expect(body.NEXT_PUBLIC_GITHUB_REPO).toBe('NOT SET');
  });
});
