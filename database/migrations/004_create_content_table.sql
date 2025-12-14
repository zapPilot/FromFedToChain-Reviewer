-- Migration: Create content table for full content storage
-- Replaces filesystem-based content with Supabase primary storage
-- Date: 2025-12-13

-- Full content storage table
CREATE TABLE IF NOT EXISTS review_web.content (
  -- Composite primary key (content can exist in multiple languages)
  id TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('zh-TW', 'en-US', 'ja-JP')),

  -- Core metadata
  category TEXT NOT NULL CHECK (category IN ('daily-news', 'ethereum', 'macro', 'startup', 'ai', 'defi')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'translated', 'wav', 'm3u8', 'cloudflare', 'content', 'social')),
  date DATE NOT NULL,

  -- Content fields
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Full markdown content
  "references" JSONB DEFAULT '[]'::jsonb, -- Array of source URLs
  framework TEXT,

  -- Media & social
  audio_file TEXT, -- Cloudflare R2 URL or relative path
  social_hook TEXT,
  knowledge_concepts_used JSONB DEFAULT '[]'::jsonb,

  -- Review feedback
  feedback JSONB DEFAULT '{}'::jsonb,

  -- Streaming URLs
  streaming_urls JSONB DEFAULT '{}'::jsonb, -- {m3u8, cloudflare, segments}

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (id, language)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_status ON review_web.content(status);
CREATE INDEX IF NOT EXISTS idx_content_category ON review_web.content(category);
CREATE INDEX IF NOT EXISTS idx_content_date ON review_web.content(date DESC);
CREATE INDEX IF NOT EXISTS idx_content_language ON review_web.content(language);
CREATE INDEX IF NOT EXISTS idx_content_status_lang ON review_web.content(status, language);

-- Enable RLS
ALTER TABLE review_web.content ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anon key can read)
CREATE POLICY "Enable read access for all users" ON review_web.content
  FOR SELECT USING (true);

-- Policy for service role write access (admin operations)
CREATE POLICY "Enable all access for service role" ON review_web.content
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION review_web.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON review_web.content
  FOR EACH ROW
  EXECUTE FUNCTION review_web.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE review_web.content IS 'Full content storage migrated from Git filesystem';
COMMENT ON COLUMN review_web.content.id IS 'Content identifier (e.g., 2025-12-13-article-title)';
COMMENT ON COLUMN review_web.content.language IS 'Content language: zh-TW (source), en-US, ja-JP';
COMMENT ON COLUMN review_web.content.category IS 'Content category';
COMMENT ON COLUMN review_web.content.status IS 'Pipeline status';
COMMENT ON COLUMN review_web.content.content IS 'Full markdown content';
COMMENT ON COLUMN review_web.content."references" IS 'Array of source URLs';
COMMENT ON COLUMN review_web.content.feedback IS 'Review feedback object';
COMMENT ON COLUMN review_web.content.streaming_urls IS 'Cloudflare R2 streaming URLs';
