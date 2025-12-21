/**
 * Pipeline Script: Run Audio Generation
 *
 * Generates WAV audio files for content using the local AudioService.
 * Called from GitHub Actions workflow.
 *
 * Environment Variables:
 *   CONTENT_ID - Required, the content ID to process
 */

import { AudioService } from '@/lib/services/audio/AudioService';
import { ContentManager } from '@/lib/ContentManager';

async function main() {
    const contentId = process.env.CONTENT_ID;

    if (!contentId) {
        console.error('Error: CONTENT_ID environment variable is required.');
        process.exit(1);
    }

    console.log(`Starting audio generation for: ${contentId}`);

    try {
        const result = await AudioService.generateWavOnly(contentId);
        console.log('Audio generation completed:', JSON.stringify(result, null, 2));

        // Check if any language failed
        const failures = Object.entries(result).filter(([, r]) => !r.success);
        if (failures.length > 0) {
            console.warn(`Warning: ${failures.length} language(s) failed audio generation`);
        }

        // Update source content status to 'wav'
        await ContentManager.updateSourceStatus(contentId, 'wav');
        console.log('Status updated to: wav');

        process.exit(0);
    } catch (error) {
        console.error('Audio generation failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Unhandled script error:', err);
    process.exit(1);
});
