/**
 * Pipeline Script: Run Cloudflare R2 Upload
 *
 * Uploads M3U8 audio files to Cloudflare R2 storage.
 * Uses FromFedToChain's CloudflareR2Service via dynamic import.
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

    console.log(`Starting Cloudflare R2 upload for: ${contentId}`);

    try {
        // Dynamically import CloudflareR2Service from FromFedToChain
        const fromFedToChainPath = path.resolve(process.cwd(), '../FromFedToChain');
        const servicePath = path.join(fromFedToChainPath, 'src/services/CloudflareR2Service.js');

        const { CloudflareR2Service } = await import(servicePath);

        if (!CloudflareR2Service || typeof CloudflareR2Service.uploadAudioToR2 !== 'function') {
            throw new Error('CloudflareR2Service.uploadAudioToR2 is not available');
        }

        const result = await CloudflareR2Service.uploadAudioToR2(contentId);
        console.log('R2 upload completed:', JSON.stringify(result, null, 2));

        // Update source content status to 'cloudflare'
        await ContentManager.updateSourceStatus(contentId, 'cloudflare');
        console.log('Status updated to: cloudflare');

        process.exit(0);
    } catch (error) {
        console.error('R2 upload failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Unhandled script error:', err);
    process.exit(1);
});
