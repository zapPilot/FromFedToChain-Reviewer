import { NextRequest, NextResponse } from "next/server";
import { AudioService } from "@/lib/services/AudioService";
import { M3U8AudioService } from "@/lib/services/M3U8AudioService";

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
  try {
    const body = await request.json();
    const { contentId, language, format = "wav" } = body;

    if (!contentId || !language) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: contentId, language",
        },
        { status: 400 }
      );
    }

    const results: {
      wav?: string;
      m3u8?: { outputPath: string; duration: number };
    } = {};

    // Generate WAV audio
    if (format === "wav" || format === "both") {
      console.log(
        `🎙️ Generating WAV audio for ${contentId} (${language})...`
      );
      const wavPath = await AudioService.generateAudio(contentId, language);
      results.wav = wavPath;
    }

    // Generate M3U8 audio
    if (format === "m3u8" || format === "both") {
      console.log(
        `🎵 Generating M3U8 audio for ${contentId} (${language})...`
      );
      const m3u8Result = await M3U8AudioService.generateM3U8Audio(
        contentId,
        language
      );
      results.m3u8 = m3u8Result;
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Audio generation completed for ${contentId} (${language})`,
    });
  } catch (error) {
    console.error("Audio generation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Audio generation failed",
      },
      { status: 500 }
    );
  }
}
