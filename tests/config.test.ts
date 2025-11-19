import { describe, it, expect } from 'vitest';
import {
  LANGUAGE_CONFIG,
  LANGUAGES,
  CATEGORIES,
  VOICE_CONFIG,
  getAudioLanguages,
  getTranslationTargets,
} from '@/config/languages';
import type { Language } from '@/types/content';

describe('Configuration', () => {
  it('provides valid language definitions', () => {
    expect(Array.isArray(LANGUAGES.SUPPORTED)).toBe(true);
    expect(typeof LANGUAGES.PRIMARY).toBe('string');
    expect(LANGUAGES.SUPPORTED).toContain(LANGUAGES.PRIMARY);

    const audioLanguages = getAudioLanguages();
    const translationTargets = getTranslationTargets();

    const supportedLanguages: Language[] = LANGUAGES.SUPPORTED;
    supportedLanguages.forEach((lang) => {
      expect(LANGUAGE_CONFIG[lang]).toBeTruthy();
      expect(VOICE_CONFIG[lang]).toBeTruthy();
      expect(LANGUAGE_CONFIG[lang].tts.voiceName).toBeTruthy();
      expect(typeof LANGUAGE_CONFIG[lang].translationCode).toBe('string');
    });

    // ensure translation targets align with config
    translationTargets.forEach((lang) => {
      expect(LANGUAGE_CONFIG[lang].isTarget).toBe(true);
    });

    audioLanguages.forEach((lang) => {
      expect(LANGUAGE_CONFIG[lang].contentProcessing.generateAudio).toBe(true);
    });
  });

  it('includes expected categories', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThan(0);
    ['daily-news', 'ethereum', 'macro'].forEach((category) =>
      expect(CATEGORIES).toContain(category as (typeof CATEGORIES)[number])
    );
  });

  it('supports social languages', () => {
    const socialLanguages: Language[] = ['en-US', 'ja-JP'];
    socialLanguages.forEach((lang) => {
      expect(LANGUAGES.SUPPORTED).toContain(
        lang as (typeof LANGUAGES.SUPPORTED)[number]
      );
      expect(VOICE_CONFIG[lang]).toBeDefined();
    });
  });
});
