import { NextRequest, NextResponse } from 'next/server';
import { CloudflareR2Service } from '@/lib/services/CloudflareR2Service';
import { isSupportedLanguage } from '@/config/languages';
import type { Language } from '@/types/content';

/**
 * POST /api/pipeline/upload
 * Upload audio files to Cloudflare R2
 *
 * Body:
 * - contentId: string - Content ID
 * - language: string - Target language
 * - format?: "wav" | "m3u8" | "both" - Upload format (default: "both")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, language, format = 'both' } = body;

    if (!contentId || !language) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: contentId, language',
        },
        { status: 400 }
      );
    }

    if (!isSupportedLanguage(language)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported language: ${language}`,
        },
        { status: 400 }
      );
    }

    const targetLanguage = language as Language;

    const results: {
      wav?: Awaited<ReturnType<typeof CloudflareR2Service.uploadWAVAudio>>;
      m3u8?: Awaited<ReturnType<typeof CloudflareR2Service.uploadM3U8Audio>>;
    } = {};

    // Upload WAV
    if (format === 'wav' || format === 'both') {
      console.log(
        `☁️ Uploading WAV to R2: ${contentId} (${targetLanguage})...`
      );
      const wavResult = await CloudflareR2Service.uploadWAVAudio(
        contentId,
        targetLanguage
      );
      results.wav = wavResult;
    }

    // Upload M3U8
    if (format === 'm3u8' || format === 'both') {
      console.log(
        `☁️ Uploading M3U8 to R2: ${contentId} (${targetLanguage})...`
      );
      const m3u8Result = await CloudflareR2Service.uploadM3U8Audio(
        contentId,
        targetLanguage
      );
      results.m3u8 = m3u8Result;
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Upload completed for ${contentId} (${language})`,
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
