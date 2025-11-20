import { NextRequest, NextResponse } from 'next/server';
import { AudioService } from '@/lib/services/AudioService';
import { M3U8AudioService } from '@/lib/services/M3U8AudioService';
import { isSupportedLanguage } from '@/config/languages';
import type { Language } from '@/types/content';
import { handleApiRoute } from '@/lib/api-helpers';

/**
 * POST /api/pipeline/generate-audio
 * Generate audio files (WAV and/or M3U8) for content
 *
 * Body:
 * - contentId: string - Content ID to process
 * - language: string - Target language
 * - format?: "wav" | "m3u8" | "both" - Audio format (default: "wav")
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contentId, language, format = 'wav' } = body;

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

  return handleApiRoute(async () => {
    const results: {
      wav?: { path: string; language: Language };
      m3u8?: Awaited<ReturnType<typeof M3U8AudioService.generateM3U8Audio>>;
    } = {};

    // Generate WAV audio
    if (format === 'wav' || format === 'both') {
      console.log(
        `🎙️ Generating WAV audio for ${contentId} (${targetLanguage})...`
      );
      const wavPath = await AudioService.generateAudio(
        contentId,
        targetLanguage
      );
      results.wav = { path: wavPath, language: targetLanguage };
    }

    // Generate M3U8 audio
    if (format === 'm3u8' || format === 'both') {
      console.log(
        `🎵 Generating M3U8 audio for ${contentId} (${targetLanguage})...`
      );
      const m3u8Result = await M3U8AudioService.generateM3U8Audio(
        contentId,
        targetLanguage
      );
      results.m3u8 = m3u8Result;
    }

    return results;
  }, 'Audio generation failed');
}
