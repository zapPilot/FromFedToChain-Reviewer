import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

// Server-side client with service role key (bypasses RLS)
// Use this for API routes that need full database access
// Returns a new client instance to prevent accidental client-side exposure
export function getSupabaseAdmin() {
  return createClient(supabaseUrl!, supabaseServiceKey!, {
    db: {
      schema: 'review_web', // Use dedicated schema
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Client-side client with anon key (respects RLS)
// For future use if you want authenticated users to access data directly
export function createBrowserClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable'
    );
  }

  return createClient(supabaseUrl!, anonKey, {
    db: {
      schema: 'review_web',
    },
  });
}
