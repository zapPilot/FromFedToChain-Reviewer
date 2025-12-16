-- Migration: Consolidate content_status into content table
-- Date: 2025-12-16
-- Purpose: Migrate review data from content_status to content.feedback, then drop legacy table
--
-- IMPORTANT: Create backups before running this migration!
-- CREATE TABLE review_web.content_status_backup AS SELECT * FROM review_web.content_status;
-- CREATE TABLE review_web.content_feedback_backup AS
--   SELECT id, language, feedback FROM review_web.content
--   WHERE language = 'zh-TW' AND id IN (SELECT id FROM review_web.content_status);

SET search_path TO review_web, public;

-- Step 1: Migrate review data from content_status → content.feedback
DO $$
DECLARE
  status_rec RECORD;
  current_feedback JSONB;
  new_feedback JSONB;
  update_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting migration of review data from content_status to content.feedback...';

  -- Iterate through all content_status records with review decisions
  FOR status_rec IN
    SELECT * FROM content_status
    WHERE review_status IN ('accepted', 'rejected')
    ORDER BY id
  LOOP
    -- Get current feedback from content table (zh-TW only, as content_status tracks source)
    SELECT feedback INTO current_feedback
    FROM content
    WHERE id = status_rec.id AND language = 'zh-TW';

    IF FOUND THEN
      -- Prepare new feedback structure
      new_feedback := COALESCE(current_feedback, '{}'::jsonb);

      -- Update content_review section with data from content_status
      new_feedback := jsonb_set(
        new_feedback,
        '{content_review}',
        jsonb_build_object(
          'status', status_rec.review_status,
          'score', COALESCE(status_rec.review_score, CASE WHEN status_rec.review_status = 'accepted' THEN 4 ELSE 2 END),
          'reviewer', COALESCE(status_rec.reviewer, 'legacy_migration'),
          'timestamp', COALESCE(status_rec.review_timestamp, status_rec.updated_at)::text,
          'comments', COALESCE(status_rec.review_feedback, '')
        )
      );

      -- Update content table
      UPDATE content
      SET
        feedback = new_feedback,
        updated_at = NOW()
      WHERE id = status_rec.id AND language = 'zh-TW';

      update_count := update_count + 1;

      RAISE NOTICE '  ✓ Migrated review data for: % (status: %)', status_rec.id, status_rec.review_status;
    ELSE
      RAISE WARNING '  ✗ Content not found in content table for: %', status_rec.id;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Migration summary: Updated % content records with review data.', update_count;
END $$;

-- Step 2: Verification - Show migrated data
DO $$ BEGIN
RAISE NOTICE '';
RAISE NOTICE 'Verification: Migrated review data in content table:';
END $$;
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      id,
      feedback->'content_review'->>'status' as review_status,
      feedback->'content_review'->>'reviewer' as reviewer,
      feedback->'content_review'->>'timestamp' as timestamp
    FROM content
    WHERE
      language = 'zh-TW'
      AND feedback->'content_review' IS NOT NULL
    ORDER BY id
  LOOP
    RAISE NOTICE '  - %: status=%, reviewer=%', rec.id, rec.review_status, rec.reviewer;
  END LOOP;
END $$;

DO $$ BEGIN
RAISE NOTICE '';
RAISE NOTICE 'Updating pipeline_jobs foreign key constraint...';
END $$;
DO $$
DECLARE
  job_count INT;
BEGIN
  -- Check if pipeline_jobs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'review_web' AND table_name = 'pipeline_jobs') THEN
    SELECT COUNT(*) INTO job_count FROM pipeline_jobs;

    IF job_count > 0 THEN
      RAISE NOTICE '  Found % pipeline_jobs records.', job_count;
    ELSE
      RAISE NOTICE '  No pipeline_jobs records found.';
    END IF;

    -- Drop the old foreign key constraint if it exists (likely referencing content_status)
    ALTER TABLE pipeline_jobs
    DROP CONSTRAINT IF EXISTS pipeline_jobs_content_id_fkey;

    RAISE NOTICE '  ✓ Old foreign key constraint dropped (if existed).';
    RAISE NOTICE '  ! Skipping creation of new FK to content table because content(id) is not unique (composite PK).';
    RAISE NOTICE '  ! Application layer must handle data integrity for pipeline_jobs -> content relations.';

  ELSE
    RAISE NOTICE '  Pipeline_jobs table does not exist. Skipping foreign key update.';
  END IF;
END $$;

-- Step 4: Drop content_status table and related objects
DO $$ BEGIN
RAISE NOTICE '';
RAISE NOTICE 'Dropping content_status table and indexes...';
END $$;
DROP TABLE IF EXISTS content_status CASCADE;
DROP INDEX IF EXISTS idx_content_status_status;
DROP INDEX IF EXISTS idx_content_status_category;
DROP INDEX IF EXISTS idx_content_status_review_status;
DROP INDEX IF EXISTS idx_content_status_updated_at;
DO $$ BEGIN
RAISE NOTICE '  ✓ content_status table and indexes dropped.';
END $$;

-- Step 5: Final verification
DO $$ BEGIN
RAISE NOTICE '';
RAISE NOTICE 'Final verification...';
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'review_web' AND table_name = 'content_status'
  ) THEN
    RAISE EXCEPTION 'ERROR: content_status table still exists after migration!';
  ELSE
    RAISE NOTICE '  ✓ content_status table successfully removed.';
  END IF;
END $$;

-- Add comment documenting the migration
COMMENT ON TABLE content IS 'Consolidated content storage. Review data migrated from deprecated content_status table on 2025-12-16. Pipeline status tracked in status field: draft→reviewed→translated→wav→m3u8→cloudflare→content→social.';

DO $$ BEGIN
RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'Migration 005 completed successfully!';
RAISE NOTICE '========================================';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Verify migrated data with: SELECT id, feedback->''content_review'' FROM content WHERE language=''zh-TW'' AND feedback->''content_review'' IS NOT NULL;';
RAISE NOTICE '2. Update application code to remove content_status references';
RAISE NOTICE '3. Update GitHub Actions workflows to write to content.status field';
RAISE NOTICE '4. Test all API endpoints';
RAISE NOTICE '';
END $$;
