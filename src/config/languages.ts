import type { Language } from '@/types/content';

export type LanguageKey = Language;

interface LanguageSettings {
  name: string;
  region: string;
  isSource: boolean;
  isTarget: boolean;
  tts: {
    languageCode: string;
    voiceName: string;
    gender: 'MALE' | 'FEMALE';
    speakingRate: number;
    pitch: number;
  };
  translationCode: string;
  social: {
    prefix: string;
    hookLength: number;
    platforms: string[];
  };
  contentProcessing: {
    generateAudio: boolean;
    generateSocialHooks: boolean;
    requiresTranslation: boolean;
  };
  m3u8: {
    enabled: boolean;
    segmentDuration: number;
    segmentFormat: string;
    uploadToR2: boolean;
  };
}

const createLanguageConfig = (settings: LanguageSettings): LanguageSettings =>
  settings;

export const LANGUAGE_CONFIG: Record<LanguageKey, LanguageSettings> = {
  'zh-TW': createLanguageConfig({
    name: 'Traditional Chinese',
    region: 'Taiwan',
    isSource: true,
    isTarget: false,
    tts: {
      languageCode: 'zh-TW',
      voiceName: 'cmn-TW-Wavenet-B',
      gender: 'FEMALE',
      speakingRate: 1.0,
      pitch: 0.0,
    },
    translationCode: 'zh',
    social: {
      prefix: '📰',
      hookLength: 180,
      platforms: ['twitter', 'threads', 'farcaster', 'debank'],
    },
    contentProcessing: {
      generateAudio: true,
      generateSocialHooks: true,
      requiresTranslation: false,
    },
    m3u8: {
      enabled: true,
      segmentDuration: 10,
      segmentFormat: 'ts',
      uploadToR2: true,
    },
  }),
  'en-US': createLanguageConfig({
    name: 'English',
    region: 'United States',
    isSource: false,
    isTarget: true,
    tts: {
      languageCode: 'en-US',
      voiceName: 'en-US-Wavenet-D',
      gender: 'MALE',
      speakingRate: 1.0,
      pitch: 0.0,
    },
    translationCode: 'en',
    social: {
      prefix: '🚀',
      hookLength: 150,
      platforms: ['twitter', 'threads', 'farcaster', 'debank'],
    },
    contentProcessing: {
      generateAudio: true,
      generateSocialHooks: true,
      requiresTranslation: true,
    },
    m3u8: {
      enabled: true,
      segmentDuration: 10,
      segmentFormat: 'ts',
      uploadToR2: true,
    },
  }),
  'ja-JP': createLanguageConfig({
    name: 'Japanese',
    region: 'Japan',
    isSource: false,
    isTarget: true,
    tts: {
      languageCode: 'ja-JP',
      voiceName: 'ja-JP-Wavenet-C',
      gender: 'FEMALE',
      speakingRate: 1.0,
      pitch: 0.0,
    },
    translationCode: 'ja',
    social: {
      prefix: '🌸',
      hookLength: 140,
      platforms: ['twitter', 'threads'],
    },
    contentProcessing: {
      generateAudio: true,
      generateSocialHooks: true,
      requiresTranslation: true,
    },
    m3u8: {
      enabled: true,
      segmentDuration: 10,
      segmentFormat: 'ts',
      uploadToR2: true,
    },
  }),
};

export const LANGUAGES = {
  PRIMARY: 'zh-TW' as LanguageKey,
  SUPPORTED: Object.keys(LANGUAGE_CONFIG) as LanguageKey[],
  TRANSLATION_TARGETS: (Object.keys(LANGUAGE_CONFIG) as LanguageKey[]).filter(
    (lang) => LANGUAGE_CONFIG[lang].isTarget
  ) as LanguageKey[],
};

export const CATEGORIES = [
  'daily-news',
  'ethereum',
  'macro',
  'startup',
  'ai',
  'defi',
] as const;

export const PATHS = {
  CONTENT_ROOT: process.env.CONTENT_DIR || './content',
  AUDIO_ROOT: process.env.AUDIO_ROOT || './audio',
  SERVICE_ACCOUNT:
    process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',
};

const getConfig = (language: string): LanguageSettings => {
  const config = LANGUAGE_CONFIG[language as LanguageKey];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return config;
};

export const getAudioLanguages = (): LanguageKey[] => {
  return LANGUAGES.SUPPORTED.filter(
    (lang) => LANGUAGE_CONFIG[lang].contentProcessing.generateAudio
  );
};

export const getTranslationTargets = (): LanguageKey[] => {
  return LANGUAGES.TRANSLATION_TARGETS;
};

export const getTTSConfig = (language: string) => {
  const config = getConfig(language);
  return {
    languageCode: config.tts.languageCode,
    name: config.tts.voiceName,
    voiceConfig: {
      languageCode: config.tts.languageCode,
      name: config.tts.voiceName,
      ssmlGender: config.tts.gender,
    },
    audioConfig: {
      audioEncoding: 'LINEAR16' as const,
      sampleRateHertz: 16000,
      speakingRate: config.tts.speakingRate,
      pitch: config.tts.pitch,
    },
  };
};

export const getTranslationConfig = (language: string) => {
  const config = getConfig(language);
  return {
    languageCode: config.translationCode,
    targetLanguage: language,
    isTarget: config.isTarget,
  };
};

export const getSocialConfig = (language: string) => {
  const config = getConfig(language);
  return config.social;
};

export const shouldGenerateAudio = (language: string): boolean => {
  return getConfig(language).contentProcessing.generateAudio;
};

export const shouldGenerateSocialHooks = (language: string): boolean => {
  return getConfig(language).contentProcessing.generateSocialHooks;
};

export const shouldGenerateM3U8 = (language: string): boolean => {
  return getConfig(language).m3u8.enabled;
};

export const shouldUploadToR2 = (language: string): boolean => {
  return getConfig(language).m3u8.uploadToR2;
};

export const getM3U8Config = (language: string) => {
  const config = getConfig(language);
  return {
    enabled: config.m3u8.enabled,
    segmentDuration: config.m3u8.segmentDuration,
    segmentFormat: config.m3u8.segmentFormat,
    uploadToR2: config.m3u8.uploadToR2,
  };
};

export const getLanguageName = (language: string): string => {
  return getConfig(language).name;
};

export const VOICE_CONFIG = Object.fromEntries(
  Object.entries(LANGUAGE_CONFIG).map(([lang, config]) => [
    lang,
    {
      languageCode: config.tts.languageCode,
      name: config.tts.voiceName,
    },
  ])
);

export const isSupportedLanguage = (value: unknown): value is LanguageKey => {
  if (typeof value !== 'string') {
    return false;
  }
  return (LANGUAGES.SUPPORTED as string[]).includes(value);
};
