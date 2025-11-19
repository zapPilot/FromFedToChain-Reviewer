import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import {
  LANGUAGE_CONFIG,
  getAudioLanguages,
  getTTSConfig,
  shouldGenerateAudio,
} from '@/config/languages';
import { ContentManager } from '@/lib/ContentManager';
import { AudioService } from '@/lib/services/AudioService';
import { GoogleTTSService } from '@/lib/services/GoogleTTSService';
import { TestUtils } from './setup';

const CONTENT_ID = '2025-07-01-audio-test';

describe('Audio Architecture', () => {
  let tempContentDir: string;
  let tempAudioDir: string;
  let originalContentDir: string;
  let originalAudioDir: string;

  beforeEach(async () => {
    tempContentDir = await TestUtils.createTempDir();
    tempAudioDir = await TestUtils.createTempDir();
    originalContentDir = ContentManager.CONTENT_DIR;
    originalAudioDir = AudioService.AUDIO_DIR;
    ContentManager.CONTENT_DIR = tempContentDir;
    AudioService.AUDIO_DIR = tempAudioDir;

    const base = TestUtils.createContent({
      id: CONTENT_ID,
      status: 'translated',
      language: 'zh-TW',
    });

    const english = TestUtils.createContent({
      ...base,
      language: 'en-US',
      title: 'English title',
      content: 'English content body.',
    });

    const japanese = TestUtils.createContent({
      ...base,
      language: 'ja-JP',
      title: 'Japanese title',
      content: 'Japanese content body.',
    });

    await TestUtils.seedContentSet(tempContentDir, [base, english, japanese]);
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalContentDir;
    AudioService.AUDIO_DIR = originalAudioDir;
    await TestUtils.cleanupTempDir(tempContentDir);
    await TestUtils.cleanupTempDir(tempAudioDir);
  });

  describe('Language configuration', () => {
    it('includes zh-TW/en-US/ja-JP in audio languages', () => {
      const audioLanguages = getAudioLanguages();
      expect(audioLanguages).toEqual(
        expect.arrayContaining(['zh-TW', 'en-US', 'ja-JP'])
      );
    });

    it('provides TTS config for each language', () => {
      ['zh-TW', 'en-US', 'ja-JP'].forEach((lang) => {
        const config = getTTSConfig(lang);
        expect(config.languageCode).toBe(
          LANGUAGE_CONFIG[lang].tts.languageCode
        );
        expect(config.name).toBe(LANGUAGE_CONFIG[lang].tts.voiceName);
        expect(shouldGenerateAudio(lang)).toBe(true);
      });
    });
  });

  describe('Audio generation', () => {
    it('generates WAV files for configured languages', async () => {
      const audioBuffer = TestUtils.createAudioBuffer();

      vi.spyOn(
        GoogleTTSService.prototype,
        'synthesizeSpeech'
      ).mockResolvedValue({
        audioContent: audioBuffer,
      } as any);
      vi.spyOn(GoogleTTSService, 'prepareContentForTTS').mockImplementation(
        (text) => text
      );

      const result = await AudioService.generateWavOnly(CONTENT_ID);

      expect(Object.keys(result)).toEqual(
        expect.arrayContaining(['zh-TW', 'en-US', 'ja-JP'])
      );

      for (const language of Object.keys(result)) {
        const info = result[language];
        expect(info.success).toBe(true);
        expect(info.audioPath).toContain(path.join(language));
        await expect(fs.access(info.audioPath!)).resolves.toBeUndefined();
      }

      const zhContent = await ContentManager.read(CONTENT_ID, 'zh-TW');
      expect(zhContent.audio_file).toContain(path.join('zh-TW', 'daily-news'));
    });
  });
});
