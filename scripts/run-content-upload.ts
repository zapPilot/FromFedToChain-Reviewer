/**
 * Pipeline Script: Run Content Upload
 *
 * Uploads content JSON to Cloudflare R2 storage.
 * TODO: Migrate ContentPipelineService to review-web (currently uses legacy V1 via dynamic import)
 *
 * Environment Variables:
 *   CONTENT_ID - Required, the content ID to process
 */

import path from 'path';
import { ContentManager } from '@/lib/ContentManager';

async function main() {
  const contentId = process.env.CONTENT_ID;

  if (!contentId) {
    console.error('Error: CONTENT_ID environment variable is required.');
    process.exit(1);
  }

  console.log(`Starting content upload for: ${contentId}`);

  try {
    // Dynamically import ContentPipelineService from FromFedToChain
    const fromFedToChainPath = path.resolve(process.cwd(), '../FromFedToChain');
    const servicePath = path.join(
      fromFedToChainPath,
      'src/services/ContentPipelineService.js'
    );

    const { ContentPipelineService } = await import(servicePath);

    if (
      !ContentPipelineService ||
      typeof ContentPipelineService.uploadContentToCloudflare !== 'function'
    ) {
      throw new Error(
        'ContentPipelineService.uploadContentToCloudflare is not available'
      );
    }

    const result =
      await ContentPipelineService.uploadContentToCloudflare(contentId);
    console.log('Content upload completed:', JSON.stringify(result, null, 2));

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
