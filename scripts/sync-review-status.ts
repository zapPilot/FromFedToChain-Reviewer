/*
 * DEPRECATED: This script is no longer needed after migration 005_consolidate_content_status.sql
 *
 * Previous Purpose:
 * - Synced review decisions from content_status table to content.feedback field
 * - Handled one-way data migration for legacy data
 *
 * Why Deprecated:
 * - content_status table has been dropped (migration 005)
 * - All review data now lives in content.feedback.content_review
 * - Migration script handles one-time data transfer
 * - Application code now writes directly to content table only
 *
 * DO NOT USE THIS SCRIPT - it will fail because content_status table no longer exists
 *
 * Date Deprecated: 2025-12-16
 * Related Migration: database/migrations/005_consolidate_content_status.sql
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.error('ERROR: This script is deprecated and should not be used.');
console.error('The content_status table no longer exists after migration 005.');
console.error(
  'All review data is now stored in content.feedback.content_review.'
);
process.exit(1);

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = envVars['SUPABASE_SERVICE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'review_web',
  },
});

async function syncReviewStatus() {
  console.log('Starting review status sync...');

  // 1. Get all content_status records with definitive review status
  const { data: statuses, error: statusError } = await supabase
    .from('content_status')
    .select('*')
    .in('review_status', ['accepted', 'rejected']);

  if (statusError) {
    console.error('Error fetching content_status:', statusError);
    return;
  }

  console.log(`Found ${statuses.length} status records to check.`);

  let updatedCount = 0;

  for (const statusRecord of statuses) {
    // 2. Get corresponding content record
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('*')
      .eq('id', statusRecord.id)
      .single();

    if (contentError) {
      console.log(`Could not find content for ${statusRecord.id}, skipping.`);
      continue;
    }

    // 3. Check if update is needed
    // If content_review status is pending or missing, but legacy has a decision
    const currentFeedback = content.feedback || {};
    const currentReviewStatus = currentFeedback.content_review?.status;

    if (!currentReviewStatus || currentReviewStatus === 'pending') {
      console.log(
        `Updating ${content.id}: ${currentReviewStatus} -> ${statusRecord.review_status}`
      );

      const newFeedback = {
        ...currentFeedback,
        content_review: {
          status: statusRecord.review_status,
          comments: statusRecord.review_feedback || '',
        },
        // Ensure structure exists
        style_review: currentFeedback.style_review || {
          status: 'pending',
          comments: '',
        },
        final_review: currentFeedback.final_review || {
          status: 'pending',
          comments: '',
        },
        summary: currentFeedback.summary || { status: 'pending', comments: '' },
      };

      const { error: updateError } = await supabase
        .from('content')
        .update({ feedback: newFeedback })
        .eq('id', content.id);

      if (updateError) {
        console.error(`Failed to update ${content.id}:`, updateError);
      } else {
        updatedCount++;
      }
    } else {
      // console.log(`Skipping ${content.id}: already has status ${currentReviewStatus}`);
    }
  }

  console.log(`Sync complete. Updated ${updatedCount} records.`);
}

syncReviewStatus().catch(console.error);
