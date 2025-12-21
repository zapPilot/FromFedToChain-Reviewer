/**
 * Pipeline Script: Run Content Upload
 *
 * Uploads content JSON to Cloudflare R2 storage.
 * Uses local ContentPipelineService (migrated from V1).
 *
 * Environment Variables:
 *   CONTENT_ID - Required, the content ID to process
 */

import { ContentPipelineService } from '@/lib/services/pipeline/ContentPipelineService';
import { ContentManager } from '@/lib/ContentManager';

async function main() {
  const contentId = process.env.CONTENT_ID;

  if (!contentId) {
    console.error('Error: CONTENT_ID environment variable is required.');
    process.exit(1);
  }

  console.log(`Starting content upload for: ${contentId}`);

  try {
    const result = await ContentPipelineService.uploadContentToCloudflare(contentId);
    console.log('Content upload completed:', JSON.stringify(result, null, 2));

    // Check if any language failed
    const failures = Object.entries(result).filter(([, r]) => !r.success);
    if (failures.length > 0) {
      console.warn(`Warning: ${failures.length} language(s) failed content upload`);
    }

    // Update source content status to 'content'
    await ContentManager.updateSourceStatus(contentId, 'content');
    console.log('Status updated to: content');

    process.exit(0);
  } catch (error) {
    console.error(
      'Content upload failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
