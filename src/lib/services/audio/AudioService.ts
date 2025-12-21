import fs from 'fs/promises';
import path from 'path';
import { GoogleTTSService } from './GoogleTTSService';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  getAudioLanguages,
  getTTSConfig,
  shouldGenerateAudio,
  PATHS,
} from '../../../../config/languages';

interface AudioGenerationResult {
  [language: string]: {
    success: boolean;
    audioPath?: string;
    error?: string;
  };
}

interface ContentRow {
  id: string;
  language: string;
  category: string;
  content: string;
  status: string;
}

export class AudioService {
  static AUDIO_DIR = PATHS.AUDIO_ROOT;

  // Generate WAV audio files only (no M3U8 or R2 upload)
  static async generateWavOnly(id: string): Promise<AudioGenerationResult> {
    const supabase = getSupabaseAdmin();

    // Check source status first (zh-TW is the source language)
    const { data: sourceContent, error: sourceError } = await supabase
      .from('content')
      .select('id, language, status')
      .eq('id', id)
      .eq('language', 'zh-TW')
      .single();

    if (sourceError || !sourceContent) {
      throw new Error(`Content ${id} not found or database error`);
    }

    // Check if status allows audio generation
    const allowedStatuses = [
      'translated',
      'wav',
      'm3u8',
      'cloudflare',
      'content',
      'social',
    ];
    if (!allowedStatuses.includes(sourceContent.status)) {
      throw new Error(
        `Content must be translated before audio generation. Current status: ${sourceContent.status}`
      );
    }

    // Get all available languages for this content
    const { data: availableContent, error: langError } = await supabase
      .from('content')
      .select('language')
      .eq('id', id);

    if (langError || !availableContent) {
      throw new Error(`Failed to fetch languages for content ${id}`);
    }

    const availableLanguages = availableContent.map((row: { language: string }) => row.language);

    // Get all languages that should have audio generated
    const audioLanguages = getAudioLanguages();

    // Find intersection of available languages and configured audio languages
    const targetLanguages = availableLanguages.filter((lang: string) =>
      audioLanguages.includes(lang)
    );

    if (targetLanguages.length === 0) {
      throw new Error(
        `No languages configured for audio generation found for content: ${id}`
      );
    }

    console.log(
      `📝 Generating WAV audio for ${targetLanguages.length} languages: ${targetLanguages.join(', ')}`
    );

    const results: AudioGenerationResult = {};

    for (const language of targetLanguages) {
      try {
        console.log(`🎙️ Generating WAV audio: ${id} (${language})`);

        // Check if this language should have audio generated
        if (!shouldGenerateAudio(language)) {
          throw new Error(
            `Audio generation not configured for language: ${language}`
          );
        }

        // Get specific language content
        const { data: content, error: contentError } = await supabase
          .from('content')
          .select('id, language, category, content, status')
          .eq('id', id)
          .eq('language', language)
          .single();

        if (contentError || !content) {
          throw new Error(`No ${language} content found for ${id}`);
        }

        // Get TTS configuration for this language
        const ttsConfig = getTTSConfig(language);
        const voiceConfig = {
          languageCode: ttsConfig.languageCode,
          name: ttsConfig.name,
        };

        const text = content.content;

        // Prepare content for TTS
        const ttsContent = GoogleTTSService.prepareContentForTTS(
          text,
          language
        );

        // Generate audio
        const ttsService = new GoogleTTSService();
        const audioResponse = await ttsService.synthesizeSpeech(
          ttsContent,
          voiceConfig
        );

        // Save audio file with category-based structure
        const audioPath = await this.saveAudioFile(
          audioResponse.audioContent,
          id,
          language,
          content.category
        );

        // Update content with audio path
        const { error: updateError } = await supabase
          .from('content')
          .update({
            audio_file: audioPath,
            status: 'wav',
          })
          .eq('id', id)
          .eq('language', language);

        if (updateError) {
          throw new Error(`Failed to update audio path in database`);
        }

        results[language] = { success: true, audioPath };
        console.log(`✅ WAV audio generated: ${audioPath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `❌ WAV generation failed for ${language}: ${errorMessage}`
        );
        results[language] = { success: false, error: errorMessage };
      }
    }

    return results;
  }

  // Save audio file to disk with category-based structure
  static async saveAudioFile(
    audioContent: Buffer,
    id: string,
    language: string,
    category: string
  ): Promise<string> {
    // Create directory structure: audio/<language>/<category>/
    const categoryDir = path.join(this.AUDIO_DIR, language, category);
    await fs.mkdir(categoryDir, { recursive: true });

    const fileName = `${id}.wav`;
    const filePath = path.join(categoryDir, fileName);

    await fs.writeFile(filePath, audioContent);

    return filePath;
  }
}
