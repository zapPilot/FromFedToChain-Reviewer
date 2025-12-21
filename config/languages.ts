// ============================================
// LANGUAGE CONFIGURATION FOR REVIEW-WEB
// Simplified version for audio pipeline
// ============================================

interface TTSConfig {
  languageCode: string;
  voiceName: string;
  gender: string;
  speakingRate: number;
  pitch: number;
}

interface LanguageConfig {
  name: string;
  region: string;
  isSource: boolean;
  isTarget: boolean;
  tts: TTSConfig;
  translationCode: string;
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

interface LanguageConfigMap {
  [key: string]: LanguageConfig;
}

export const LANGUAGE_CONFIG: LanguageConfigMap = {
  // Source language (Traditional Chinese)
  'zh-TW': {
    name: 'Traditional Chinese',
    region: 'Taiwan',
    isSource: true,
    isTarget: false,

    // Google Cloud TTS Configuration
    tts: {
      languageCode: 'zh-TW',
      voiceName: 'cmn-TW-Wavenet-B',
      gender: 'FEMALE',
      speakingRate: 1.0,
      pitch: 0.0,
    },

    // Translation API mapping
    translationCode: 'zh',

    // Content processing
    contentProcessing: {
      generateAudio: true,
      generateSocialHooks: true,
      requiresTranslation: false,
    },

    // M3U8 streaming configuration
    m3u8: {
      enabled: true,
      segmentDuration: 10,
      segmentFormat: 'ts',
      uploadToR2: true,
    },
  },

  // English (US)
  'en-US': {
    name: 'English',
    region: 'United States',
    isSource: false,
    isTarget: true,

    // Google Cloud TTS Configuration
    tts: {
      languageCode: 'en-US',
      voiceName: 'en-US-Wavenet-D',
      gender: 'MALE',
      speakingRate: 1.0,
      pitch: 0.0,
    },

    // Translation API mapping
    translationCode: 'en',

    // Content processing
    contentProcessing: {
      generateAudio: true,
      generateSocialHooks: true,
      requiresTranslation: true,
    },

    // M3U8 streaming configuration
    m3u8: {
      enabled: true,
      segmentDuration: 10,
      segmentFormat: 'ts',
      uploadToR2: true,
    },
  },

  // Japanese
  'ja-JP': {
    name: 'Japanese',
    region: 'Japan',
    isSource: false,
    isTarget: true,

    // Google Cloud TTS Configuration
    tts: {
      languageCode: 'ja-JP',
      voiceName: 'ja-JP-Wavenet-C',
      gender: 'FEMALE',
      speakingRate: 1.0,
      pitch: 0.0,
    },

    // Translation API mapping
    translationCode: 'ja',

    // Content processing
    contentProcessing: {
      generateAudio: true,
      generateSocialHooks: true,
      requiresTranslation: true,
    },

    // M3U8 streaming configuration
    m3u8: {
      enabled: true,
      segmentDuration: 10,
      segmentFormat: 'ts',
      uploadToR2: true,
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get all languages that should have audio generated
export const getAudioLanguages = (): string[] => {
  return Object.keys(LANGUAGE_CONFIG).filter(
    (lang) => LANGUAGE_CONFIG[lang].contentProcessing.generateAudio
  );
};

// Get translation target languages (excluding source)
export const getTranslationTargets = (): string[] => {
  return Object.keys(LANGUAGE_CONFIG).filter(
    (lang) => LANGUAGE_CONFIG[lang].isTarget
  );
};

// Get TTS configuration for a language
export const getTTSConfig = (language: string) => {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

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

// Check if language should have audio generated
export const shouldGenerateAudio = (language: string): boolean => {
  return LANGUAGE_CONFIG[language]?.contentProcessing?.generateAudio || false;
};

// Check if language should have M3U8 generated
export const shouldGenerateM3U8 = (language: string): boolean => {
  return LANGUAGE_CONFIG[language]?.m3u8?.enabled || false;
};

// Check if language should upload to R2
export const shouldUploadToR2 = (language: string): boolean => {
  return LANGUAGE_CONFIG[language]?.m3u8?.uploadToR2 || false;
};

// Get M3U8 configuration for a language
export const getM3U8Config = (language: string) => {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return {
    enabled: config.m3u8?.enabled || false,
    segmentDuration: config.m3u8?.segmentDuration || 10,
    segmentFormat: config.m3u8?.segmentFormat || 'ts',
    uploadToR2: config.m3u8?.uploadToR2 || false,
  };
};

// Get language display name
export const getLanguageName = (language: string): string => {
  return LANGUAGE_CONFIG[language]?.name || language;
};

// File system paths
export const PATHS = {
  CONTENT_ROOT: './content',
  AUDIO_ROOT: './audio',
  SERVICE_ACCOUNT: './service-account.json',
};

// Supported languages list
export const LANGUAGES = {
  PRIMARY: 'zh-TW',
  SUPPORTED: Object.keys(LANGUAGE_CONFIG),
  TRANSLATION_TARGETS: getTranslationTargets(),
};

// Content categories
export const CATEGORIES = [
  'daily-news',
  'ethereum',
  'macro',
  'startup',
  'ai',
  'defi',
];
