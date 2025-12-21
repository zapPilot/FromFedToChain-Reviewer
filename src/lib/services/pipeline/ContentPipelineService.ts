/**
 * Content Pipeline Service
 *
 * Uploads final content JSON to Cloudflare R2 for CDN distribution.
 * Final step in the content processing pipeline.
 */

import fs from 'fs/promises';
import path from 'path';
import { getSupabaseAdmin } from '@/lib/supabase';
import { executeCommand } from '@/lib/utils/command-executor';
import { getAudioLanguages, PATHS } from '../../../../config/languages';

interface ContentUploadResult {
    [language: string]: {
        success: boolean;
        contentUrl?: string;
        error?: string;
    };
}

// R2 configuration from environment
const R2_BUCKET = process.env.R2_BUCKET || 'audio-streaming';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://audio.example.com';

export class ContentPipelineService {
    static CONTENT_DIR = PATHS.CONTENT_ROOT;

    /**
     * Upload content JSON to Cloudflare R2 for all languages
     * @param contentId - Content ID to process
     * @returns Upload results per language
     */
    static async uploadContentToCloudflare(
        contentId: string
    ): Promise<ContentUploadResult> {
        const supabase = getSupabaseAdmin();

        // Get all content records ready for upload
        const { data: contentRecords, error: fetchError } = await supabase
            .from('content')
            .select('id, language, category, content, streaming_url, status')
            .eq('id', contentId);

        if (fetchError || !contentRecords) {
            throw new Error(`Failed to fetch content ${contentId}: ${fetchError?.message}`);
        }

        // Filter to languages with cloudflare status (R2 audio uploaded)
        const audioLanguages = getAudioLanguages();
        const eligibleRecords = contentRecords.filter(
            (record: { language: string; streaming_url: string | null; status: string }) =>
                audioLanguages.includes(record.language) &&
                record.streaming_url &&
                ['cloudflare', 'content', 'social'].includes(record.status)
        );

        if (eligibleRecords.length === 0) {
            throw new Error(`No eligible content found for upload: ${contentId}`);
        }

        console.log(
            `📄 Uploading ${eligibleRecords.length} content files to R2 for: ${contentId}`
        );

        const results: ContentUploadResult = {};

        for (const record of eligibleRecords) {
            const { language, category, content, streaming_url } = record as {
                language: string;
                category: string;
                content: string;
                streaming_url: string;
            };

            try {
                console.log(`📤 Uploading content JSON: ${contentId} (${language})`);

                // Create temp directory for content JSON
                const tempDir = path.join('/tmp', 'content-upload', contentId, language);
                await fs.mkdir(tempDir, { recursive: true });

                // Build content JSON structure
                const contentJson = {
                    id: contentId,
                    language,
                    category,
                    content,
                    streamingUrl: streaming_url,
                    updatedAt: new Date().toISOString(),
                };

                // Write content JSON to temp file
                const jsonPath = path.join(tempDir, 'content.json');
                await fs.writeFile(jsonPath, JSON.stringify(contentJson, null, 2));

                // R2 destination
                const r2Destination = `r2:${R2_BUCKET}/content/${language}/${category}/${contentId}/`;

                // Build rclone command
                const rcloneArgs = [
                    'copy',
                    tempDir,
                    r2Destination,
                    '--include', '*.json',
                    '-v',
                ];

                // Execute rclone
                const result = await executeCommand('rclone', rcloneArgs);

                if (!result.success) {
                    throw new Error(`rclone failed: ${result.error}`);
                }

                // Construct public URL
                const contentUrl = `${R2_PUBLIC_URL}/content/${language}/${category}/${contentId}/content.json`;

                // Update database with content URL and final status
                const { error: updateError } = await supabase
                    .from('content')
                    .update({
                        content_url: contentUrl,
                        status: 'content',
                    })
                    .eq('id', contentId)
                    .eq('language', language);

                if (updateError) {
                    throw new Error(`Database update failed: ${updateError.message}`);
                }

                // Clean up temp files
                await fs.rm(tempDir, { recursive: true, force: true });

                results[language] = {
                    success: true,
                    contentUrl,
                };

                console.log(`✅ Content uploaded: ${contentUrl}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`❌ Content upload failed for ${language}: ${errorMessage}`);
                results[language] = { success: false, error: errorMessage };
            }
        }

        return results;
    }

    /**
     * Get the public content URL for a content item
     */
    static getContentUrl(contentId: string, language: string, category: string): string {
        return `${R2_PUBLIC_URL}/content/${language}/${category}/${contentId}/content.json`;
    }
}
