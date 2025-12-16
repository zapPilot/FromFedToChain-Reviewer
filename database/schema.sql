-- Review Web Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create dedicated schema for review-web (keeps public schema clean)
CREATE SCHEMA IF NOT EXISTS review_web;

-- Set search path for this session
SET search_path TO review_web, public;

-- DEPRECATED: content_status table has been consolidated into content table (migration 005)
-- Review data is now stored in content.feedback JSONB field
-- Pipeline status is tracked in content.status field

-- Pipeline job tracking (for monitoring and debugging)
CREATE TABLE review_web.pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id TEXT NOT NULL REFERENCES review_web.content(id) ON DELETE CASCADE,

  -- Job details
  job_type TEXT NOT NULL,                -- 'translate', 'audio', 'cloudflare'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'

  -- Execution tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- GitHub Actions integration
  github_run_id TEXT,
  github_run_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
-- (content_status indexes removed - table deprecated in migration 005)

CREATE INDEX idx_pipeline_jobs_content_id ON review_web.pipeline_jobs(content_id);
CREATE INDEX idx_pipeline_jobs_status ON review_web.pipeline_jobs(status);
CREATE INDEX idx_pipeline_jobs_created_at ON review_web.pipeline_jobs(created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION review_web.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for content_status removed (table deprecated in migration 005)

-- Row Level Security (RLS) - Adjust based on your auth setup
-- (content_status RLS removed - table deprecated in migration 005)
ALTER TABLE review_web.pipeline_jobs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your Next.js API will use service role key)
CREATE POLICY "Service role has full access to pipeline_jobs"
  ON review_web.pipeline_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Optional: If you want authenticated users to read data (for dashboard/reporting)
-- Uncomment if needed:
-- CREATE POLICY "Authenticated users can read content_status"
--   ON review_web.content_status
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Verification queries (run after table creation)
-- SELECT COUNT(*) FROM review_web.content_status;
-- SELECT COUNT(*) FROM review_web.pipeline_jobs;
-- SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'review_web';
