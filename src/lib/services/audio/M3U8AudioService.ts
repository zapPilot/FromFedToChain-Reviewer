/**
 * M3U8 Audio Service
 *
 * Converts WAV audio files to M3U8 HLS streaming format using FFmpeg.
 * Part of the content pipeline for generating streaming-ready audio.
 */

import fs from 'fs/promises';
import path from 'path';
import { getSupabaseAdmin } from '@/lib/supabase';
import { executeCommand } from '@/lib/utils/command-executor';
import {
    getAudioLanguages,
    getM3U8Config,
    shouldGenerateM3U8,
    PATHS,
} from '../../../../config/languages';

interface M3U8ConversionResult {
    [language: string]: {
        success: boolean;
        m3u8Path?: string;
        segmentCount?: number;
        error?: string;
    };
}

export class M3U8AudioService {
    static M3U8_DIR = path.join(PATHS.AUDIO_ROOT, 'm3u8');

    /**
     * Convert WAV audio files to M3U8 HLS format for all languages
     * @param contentId - Content ID to process
     * @returns Conversion results per language
     */
    static async convertToM3U8(contentId: string): Promise<M3U8ConversionResult> {
        const supabase = getSupabaseAdmin();

        // Get all content records for this ID
        const { data: contentRecords, error: fetchError } = await supabase
            .from('content')
            .select('id, language, category, audio_file, status')
            .eq('id', contentId);

        if (fetchError || !contentRecords) {
            throw new Error(`Failed to fetch content ${contentId}: ${fetchError?.message}`);
        }

        // Filter to languages with WAV files and M3U8 enabled
        const audioLanguages = getAudioLanguages();
        const eligibleRecords = contentRecords.filter(
            (record: { language: string; audio_file: string | null; status: string }) =>
                audioLanguages.includes(record.language) &&
                record.audio_file &&
                shouldGenerateM3U8(record.language) &&
                ['wav', 'm3u8', 'cloudflare', 'content', 'social'].includes(record.status)
        );

        if (eligibleRecords.length === 0) {
            throw new Error(`No eligible WAV files found for M3U8 conversion: ${contentId}`);
        }

        console.log(
            `🎵 Converting ${eligibleRecords.length} WAV files to M3U8 for: ${contentId}`
        );

        const results: M3U8ConversionResult = {};

        for (const record of eligibleRecords) {
            const { language, category, audio_file } = record as {
                language: string;
                category: string;
                audio_file: string;
            };

            try {
                console.log(`🔄 Converting to M3U8: ${contentId} (${language})`);

                // Get M3U8 config for this language
                const m3u8Config = getM3U8Config(language);

                // Create output directory: audio/m3u8/<language>/<category>/<contentId>/
                const outputDir = path.join(this.M3U8_DIR, language, category, contentId);
                await fs.mkdir(outputDir, { recursive: true });

                // Output paths
                const m3u8Path = path.join(outputDir, 'audio.m3u8');
                const segmentPattern = path.join(outputDir, 'segment_%03d.ts');

                // Build FFmpeg command for HLS conversion
                const ffmpegArgs = [
                    '-i', audio_file,
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-ac', '2',
                    '-ar', '44100',
                    '-f', 'hls',
                    '-hls_time', String(m3u8Config.segmentDuration),
                    '-hls_list_size', '0',
                    '-hls_segment_filename', segmentPattern,
                    m3u8Path,
                ];

                // Execute FFmpeg
                const result = await executeCommand('ffmpeg', ffmpegArgs);

                if (!result.success) {
                    throw new Error(`FFmpeg failed: ${result.error}`);
                }

                // Count segments created
                const files = await fs.readdir(outputDir);
                const segmentCount = files.filter((f) => f.endsWith('.ts')).length;

                // Update database with M3U8 path
                const { error: updateError } = await supabase
                    .from('content')
                    .update({
                        m3u8_file: m3u8Path,
                        status: 'm3u8',
                    })
                    .eq('id', contentId)
                    .eq('language', language);

                if (updateError) {
                    throw new Error(`Database update failed: ${updateError.message}`);
                }

                results[language] = {
                    success: true,
                    m3u8Path,
                    segmentCount,
                };

                console.log(`✅ M3U8 created: ${m3u8Path} (${segmentCount} segments)`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`❌ M3U8 conversion failed for ${language}: ${errorMessage}`);
                results[language] = { success: false, error: errorMessage };
            }
        }

        return results;
    }

    /**
     * Get M3U8 output path for a content item
     */
    static getM3U8Path(contentId: string, language: string, category: string): string {
        return path.join(this.M3U8_DIR, language, category, contentId, 'audio.m3u8');
    }
}
