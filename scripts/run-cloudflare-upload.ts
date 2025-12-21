/**
 * Pipeline Script: Run Cloudflare R2 Upload
 *
 * Uploads M3U8 audio files to Cloudflare R2 storage.
 * Uses local CloudflareR2Service (migrated from V1).
 *
 * Environment Variables:
 *   CONTENT_ID - Required, the content ID to process
 */

import { CloudflareR2Service } from '@/lib/services/pipeline/CloudflareR2Service';
import { ContentManager } from '@/lib/ContentManager';

async function main() {
  const contentId = process.env.CONTENT_ID;

  if (!contentId) {
    console.error('Error: CONTENT_ID environment variable is required.');
    process.exit(1);
  }

  console.log(`Starting Cloudflare R2 upload for: ${contentId}`);

  try {
    const result = await CloudflareR2Service.uploadAudioToR2(contentId);
    console.log('R2 upload completed:', JSON.stringify(result, null, 2));

    // Check if any language failed
    const failures = Object.entries(result).filter(([, r]) => !r.success);
    if (failures.length > 0) {
      console.warn(`Warning: ${failures.length} language(s) failed R2 upload`);
    }

    // Update source content status to 'cloudflare'
    await ContentManager.updateSourceStatus(contentId, 'cloudflare');
    console.log('Status updated to: cloudflare');

    process.exit(0);
  } catch (error) {
    console.error(
      'R2 upload failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
