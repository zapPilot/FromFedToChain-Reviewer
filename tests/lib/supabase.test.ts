import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock createClient from supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key, options) => ({
    url,
    key,
    options,
    from: vi.fn(),
  })),
}));

describe('Supabase Client Utilities', () => {
  let createClientMock: any;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    const supabaseModule = await import('@supabase/supabase-js');
    createClientMock = supabaseModule.createClient;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe('getSupabaseAdmin', () => {
    it('creates admin client with correct config', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      const { getSupabaseAdmin } = await import('@/lib/supabase');
      const client = getSupabaseAdmin();

      expect(createClientMock).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key',
        expect.objectContaining({
          db: { schema: 'review_web' },
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      );
      expect(client).toBeDefined();
    });

    it('throws error when SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.SUPABASE_SERVICE_KEY = 'test-key';

      const { getSupabaseAdmin } = await import('@/lib/supabase');

      expect(() => getSupabaseAdmin()).toThrow(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
      );
    });

    it('throws error when SERVICE_KEY is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_SERVICE_KEY;

      const { getSupabaseAdmin } = await import('@/lib/supabase');

      expect(() => getSupabaseAdmin()).toThrow(
        'Missing SUPABASE_SERVICE_KEY environment variable'
      );
    });
  });

  describe('createBrowserClient', () => {
    it('creates browser client with correct config', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      const { createBrowserClient } = await import('@/lib/supabase');
      const client = createBrowserClient();

      expect(createClientMock).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          db: { schema: 'review_web' },
        })
      );
      expect(client).toBeDefined();
    });

    it('throws error when SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

      const { createBrowserClient } = await import('@/lib/supabase');

      expect(() => createBrowserClient()).toThrow(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
      );
    });

    it('throws error when ANON_KEY is missing', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { createBrowserClient } = await import('@/lib/supabase');

      expect(() => createBrowserClient()).toThrow(
        'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable'
      );
    });
  });
});
