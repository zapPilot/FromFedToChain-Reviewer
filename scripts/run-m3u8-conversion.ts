/**
 * Pipeline Script: Run M3U8 Conversion
 *
 * Converts WAV audio files to M3U8 HLS streaming format.
 * Uses local M3U8AudioService (migrated from V1).
 *
 * Environment Variables:
 *   CONTENT_ID - Required, the content ID to process
 */

import { M3U8AudioService } from '@/lib/services/audio/M3U8AudioService';
import { ContentManager } from '@/lib/ContentManager';

async function main() {
  const contentId = process.env.CONTENT_ID;

  if (!contentId) {
    console.error('Error: CONTENT_ID environment variable is required.');
    process.exit(1);
  }

  console.log(`Starting M3U8 conversion for: ${contentId}`);

  try {
    const result = await M3U8AudioService.convertToM3U8(contentId);
    console.log('M3U8 conversion completed:', JSON.stringify(result, null, 2));

    // Check if any language failed
    const failures = Object.entries(result).filter(([, r]) => !r.success);
    if (failures.length > 0) {
      console.warn(`Warning: ${failures.length} language(s) failed M3U8 conversion`);
    }

    // Update source content status to 'm3u8'
    await ContentManager.updateSourceStatus(contentId, 'm3u8');
    console.log('Status updated to: m3u8');

    process.exit(0);
  } catch (error) {
    console.error(
      'M3U8 conversion failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
