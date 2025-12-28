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
import { getErrorMessage } from '@/lib/utils/error-handler';
import { getAudioLanguages, PATHS } from '../../../../config/languages';
import { R2Utils } from './R2Utils';

interface ContentUploadResult {
  [language: string]: {
    success: boolean;
    contentUrl?: string;
    error?: string;
  };
}

// R2 configuration (migrated from V1 CloudflareR2Service.js)
const R2_BUCKET = 'fromfedtochain';
const R2_PUBLIC_URL =
  'https://fromfedtochain.1352ed9cb1e236fe232f67ff3a8e9850.r2.cloudflarestorage.com';

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

    // Get all content records ready for upload - fetch ALL fields for V1 compatible JSON
    const { data: contentRecords, error: fetchError } = await supabase
      .from('content')
      .select('*')
      .eq('id', contentId);

    if (fetchError || !contentRecords) {
      throw new Error(
        `Failed to fetch content ${contentId}: ${fetchError?.message}`
      );
    }

    // Filter to languages with cloudflare status (R2 audio uploaded)
    const audioLanguages = getAudioLanguages();
    const eligibleRecords = contentRecords.filter(
      (record: { language: string; status: string }) =>
        audioLanguages.includes(record.language) &&
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
      const { language, category } = record as {
        language: string;
        category: string;
      };

      try {
        console.log(`📤 Uploading content JSON: ${contentId} (${language})`);

        // Create temp directory for content JSON
        const tempDir = path.join(
          '/tmp',
          'content-upload',
          contentId,
          language
        );
        await fs.mkdir(tempDir, { recursive: true });

        // List segment files from R2 to build segments array (matches V1 format)
        const segmentUrls = await this.listR2Segments(
          language,
          category,
          contentId
        );

        // Derive streaming URL for M3U8 playlist
        const m3u8Url = `${R2_PUBLIC_URL}/audio/${language}/${category}/${contentId}/playlist.m3u8`;

        // Build complete V1-compatible content JSON structure (exact match)
        const contentJson = {
          id: record.id,
          status: record.status,
          category: record.category,
          date: record.date,
          language: record.language,
          title: record.title,
          content: record.content,
          references: record.references || [],
          framework: record.framework || '',
          knowledge_concepts_used: record.knowledge_concepts_used || [],
          audio_file: record.audio_file || null,
          social_hook: record.social_hook || null,
          feedback: record.feedback || { content_review: null },
          updated_at: new Date().toISOString(),
          streaming_urls: {
            m3u8: m3u8Url,
            segments: segmentUrls,
          },
        };

        // Write content JSON to temp file
        const jsonPath = path.join(tempDir, `${contentId}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(contentJson, null, 2));

        // R2 destination - use copyto for exact path (no folder creation)
        const r2Destination = `r2:${R2_BUCKET}/content/${language}/${category}/${contentId}.json`;

        // Build rclone command - use 'copyto' instead of 'copy' to avoid folder creation
        const rcloneArgs = ['copyto', jsonPath, r2Destination, '-v'];

        // Execute rclone
        const result = await executeCommand('rclone', rcloneArgs);

        if (!result.success) {
          throw new Error(`rclone failed: ${result.error}`);
        }

        // Construct public URL
        const contentUrl = `${R2_PUBLIC_URL}/content/${language}/${category}/${contentId}.json`;

        // Update database status to 'content'
        const { error: updateError } = await supabase
          .from('content')
          .update({
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
        const errorMessage = getErrorMessage(error);
        console.error(
          `❌ Content upload failed for ${language}: ${errorMessage}`
        );
        results[language] = { success: false, error: errorMessage };
      }
    }

    return results;
  }

  /**
   * Get the public content URL for a content item
   */
  static getContentUrl(
    contentId: string,
    language: string,
    category: string
  ): string {
    return `${R2_PUBLIC_URL}/content/${language}/${category}/${contentId}.json`;
  }

  /**
   * List segment files from R2 for a content item (matches V1 format)
   * @param language - Language code
   * @param category - Content category
   * @param contentId - Content ID
   * @returns Array of segment URLs sorted by segment number
   */
  static async listR2Segments(
    language: string,
    category: string,
    contentId: string
  ): Promise<string[]> {
    const r2Path = `r2:${R2_BUCKET}/audio/${language}/${category}/${contentId}/`;

    try {
      // Use rclone ls to list files in the R2 directory
      const result = await executeCommand('rclone', ['ls', r2Path]);

      if (!result.success) {
        console.warn(`⚠️ Could not list R2 segments: ${result.error}`);
        return [];
      }

      // Parse rclone ls output: "  size filename" format
      const segmentFiles = R2Utils.parseRcloneLsOutput(result.output || '');

      // Sort segments by number (segment000.ts, segment001.ts, etc.)
      const sortedFiles = R2Utils.sortSegmentFiles(segmentFiles);

      // Build full URLs
      const baseUrl = `${R2_PUBLIC_URL}/audio/${language}/${category}/${contentId}`;
      return sortedFiles.map((f) => `${baseUrl}/${f}`);
    } catch (error) {
      console.warn(`⚠️ Error listing R2 segments: ${getErrorMessage(error)}`);
      return [];
    }
  }
}
