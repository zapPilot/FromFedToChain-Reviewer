/**
 * Pipeline Script: Run M3U8 Conversion
 *
 * Converts WAV audio files to M3U8 HLS streaming format.
 * Uses FromFedToChain's M3U8AudioService via dynamic import.
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

    console.log(`Starting M3U8 conversion for: ${contentId}`);

    try {
        // Dynamically import M3U8AudioService from FromFedToChain
        const fromFedToChainPath = path.resolve(process.cwd(), '../FromFedToChain');
        const servicePath = path.join(fromFedToChainPath, 'src/services/M3U8AudioService.js');

        const { M3U8AudioService } = await import(servicePath);

        if (!M3U8AudioService || typeof M3U8AudioService.convertToM3U8 !== 'function') {
            throw new Error('M3U8AudioService.convertToM3U8 is not available');
        }

        const result = await M3U8AudioService.convertToM3U8(contentId);
        console.log('M3U8 conversion completed:', JSON.stringify(result, null, 2));

        // Update source content status to 'm3u8'
        await ContentManager.updateSourceStatus(contentId, 'm3u8');
        console.log('Status updated to: m3u8');

        process.exit(0);
    } catch (error) {
        console.error('M3U8 conversion failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Unhandled script error:', err);
    process.exit(1);
});
