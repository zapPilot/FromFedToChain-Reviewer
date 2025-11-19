import fs from 'fs/promises';
import path from 'path';
import { GoogleTTSService } from './GoogleTTSService';
import { ContentManager } from '../ContentManager';
import {
  getAudioLanguages,
  getTTSConfig,
  shouldGenerateAudio,
} from '@/config/languages';

interface AudioServiceResult {
  success: boolean;
  audioPath?: string;
  error?: string;
}

export class AudioService {
  static AUDIO_DIR = process.env.AUDIO_ROOT || 'audio';

  // Generate WAV audio files only (no M3U8 or R2 upload)
  static async generateWavOnly(
    id: string
  ): Promise<Record<string, AudioServiceResult>> {
    // Check source status first
    const sourceContent = await ContentManager.readSource(id);

    if (sourceContent.status !== 'translated') {
      throw new Error(
        `Content must be translated before audio generation. Current status: ${sourceContent.status}`
      );
    }

    // Get all available languages for this content
    const availableLanguages = await ContentManager.getAvailableLanguages(id);

    // Get all languages that should have audio generated
    const audioLanguages = getAudioLanguages();

    // Find intersection of available languages and configured audio languages
    const targetLanguages = availableLanguages.filter((lang) =>
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

    const results: Record<string, AudioServiceResult> = {};

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
        const content = await ContentManager.read(id, language);

        if (!content) {
          throw new Error(`No ${language} content found for ${id}`);
        }

        // Get TTS configuration for this language
        const ttsConfig = getTTSConfig(language);
        const voiceConfig = {
          languageCode: ttsConfig.languageCode,
          name: ttsConfig.name,
        };

        const { content: text } = content;

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

        // Update content with audio path (no URLs yet)
        await ContentManager.addAudio(id, language, audioPath, {});

        results[language] = { success: true, audioPath };
        console.log(`✅ WAV audio generated: ${audioPath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
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
