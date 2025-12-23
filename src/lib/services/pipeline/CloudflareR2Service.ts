/**
 * Cloudflare R2 Service
 *
 * Uploads audio files (WAV/M3U8) to Cloudflare R2 storage using rclone.
 * Part of the content pipeline for CDN distribution.
 */

import fs from 'fs/promises';
import path from 'path';
import { getSupabaseAdmin } from '@/lib/supabase';
import { executeCommand } from '@/lib/utils/command-executor';
import {
  getAudioLanguages,
  shouldUploadToR2,
  PATHS,
} from '../../../../config/languages';

interface R2UploadResult {
  [language: string]: {
    success: boolean;
    r2Url?: string;
    filesUploaded?: number;
    error?: string;
  };
}

// R2 configuration (migrated from V1 CloudflareR2Service.js)
const R2_BUCKET = 'fromfedtochain';
const R2_PUBLIC_URL =
  'https://fromfedtochain.1352ed9cb1e236fe232f67ff3a8e9850.r2.cloudflarestorage.com';

export class CloudflareR2Service {
  static M3U8_DIR = path.join(PATHS.AUDIO_ROOT, 'm3u8');

  /**
   * Upload M3U8 audio files to Cloudflare R2 for all languages
   * @param contentId - Content ID to process
   * @returns Upload results per language
   */
  static async uploadAudioToR2(contentId: string): Promise<R2UploadResult> {
    const supabase = getSupabaseAdmin();

    // Get all content records for this content ID
    const { data: contentRecords, error: fetchError } = await supabase
      .from('content')
      .select('id, language, category, status')
      .eq('id', contentId);

    if (fetchError || !contentRecords) {
      throw new Error(
        `Failed to fetch content ${contentId}: ${fetchError?.message}`
      );
    }

    // Filter to languages with R2 upload enabled and eligible status
    const audioLanguages = getAudioLanguages();
    const eligibleRecords = contentRecords.filter(
      (record: { language: string; status: string }) =>
        audioLanguages.includes(record.language) &&
        shouldUploadToR2(record.language) &&
        ['m3u8', 'cloudflare', 'content', 'social'].includes(record.status)
    );

    if (eligibleRecords.length === 0) {
      throw new Error(
        `No eligible content records found for R2 upload: ${contentId}`
      );
    }

    console.log(
      `☁️ Uploading ${eligibleRecords.length} M3U8 files to R2 for: ${contentId}`
    );

    const results: R2UploadResult = {};

    for (const record of eligibleRecords) {
      const { language, category } = record as {
        language: string;
        category: string;
      };

      try {
        console.log(`📤 Uploading to R2: ${contentId} (${language})`);

        // Derive the M3U8 directory path from content metadata
        // Format: audio/m3u8/{language}/{category}/{contentId}/
        const sourceDir = path.join(
          this.M3U8_DIR,
          language,
          category,
          contentId
        );
        const r2Destination = `r2:${R2_BUCKET}/audio/${language}/${category}/${contentId}/`;

        // Verify source directory exists
        try {
          await fs.access(sourceDir);
        } catch {
          throw new Error(`Source directory not found: ${sourceDir}`);
        }

        // Count files to upload
        const files = await fs.readdir(sourceDir);
        const uploadableFiles = files.filter(
          (f) => f.endsWith('.m3u8') || f.endsWith('.ts')
        );

        if (uploadableFiles.length === 0) {
          throw new Error('No M3U8 or TS files found in source directory');
        }

        // Build rclone command
        const rcloneArgs = [
          'copy',
          sourceDir,
          r2Destination,
          '--include',
          '*.m3u8',
          '--include',
          '*.ts',
          '-v',
        ];

        // Execute rclone
        const result = await executeCommand('rclone', rcloneArgs);

        if (!result.success) {
          throw new Error(`rclone failed: ${result.error}`);
        }

        // Construct public URL
        const r2Url = `${R2_PUBLIC_URL}/audio/${language}/${category}/${contentId}/audio.m3u8`;

        // Update database status to 'cloudflare'
        const { error: updateError } = await supabase
          .from('content')
          .update({
            status: 'cloudflare',
          })
          .eq('id', contentId)
          .eq('language', language);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        results[language] = {
          success: true,
          r2Url,
          filesUploaded: uploadableFiles.length,
        };

        console.log(
          `✅ Uploaded to R2: ${r2Url} (${uploadableFiles.length} files)`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ R2 upload failed for ${language}: ${errorMessage}`);
        results[language] = { success: false, error: errorMessage };
      }
    }

    return results;
  }

  /**
   * Get the public R2 URL for a content item
   */
  static getStreamingUrl(
    contentId: string,
    language: string,
    category: string
  ): string {
    return `${R2_PUBLIC_URL}/audio/${language}/${category}/${contentId}/audio.m3u8`;
  }
}
