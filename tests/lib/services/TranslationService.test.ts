import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TranslationService } from '@/lib/services/TranslationService';
import type { ContentItem } from '@/types/content';

// Hoist mocks to avoid reference errors
const {
  mockTranslate,
  mockReadSource,
  mockAddTranslation,
  mockUpdateSourceStatus,
} = vi.hoisted(() => ({
  mockTranslate: vi.fn(),
  mockReadSource: vi.fn(),
  mockAddTranslation: vi.fn(),
  mockUpdateSourceStatus: vi.fn(),
}));

// Mock Google Translate client
vi.mock('@google-cloud/translate', () => ({
  v2: {
    Translate: vi.fn().mockImplementation(() => ({
      translate: mockTranslate,
    })),
  },
}));

// Mock ContentManager
vi.mock('@/lib/ContentManager', () => ({
  ContentManager: {
    readSource: mockReadSource,
    addTranslation: mockAddTranslation,
    updateSourceStatus: mockUpdateSourceStatus,
  },
}));

// Mock language configuration
vi.mock('@/config/languages', () => ({
  LANGUAGES: {
    SOURCE: 'zh-TW',
    TRANSLATION_TARGETS: ['en-US', 'ja-JP'],
  },
  getTranslationConfig: vi.fn((lang: string) => ({
    languageCode: lang === 'en-US' ? 'en' : 'ja',
  })),
}));

describe('TranslationService', () => {
  const mockSourceContent: ContentItem = {
    id: 'test-content-id',
    status: 'reviewed',
    category: 'ethereum',
    date: '2025-01-01',
    language: 'zh-TW',
    title: '測試標題',
    content: '這是測試內容。',
    references: ['來源1'],
    framework: 'crypto',
    audio_file: null,
    social_hook: null,
    feedback: { content_review: null },
    updated_at: new Date().toISOString(),
    knowledge_concepts_used: [],
    streaming_urls: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSource.mockResolvedValue(mockSourceContent);
    mockTranslate.mockImplementation((text: string) => {
      return Promise.resolve([`Translated: ${text}`]);
    });
    mockAddTranslation.mockResolvedValue(undefined);
    mockUpdateSourceStatus.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('translateContent', () => {
    it('translates content to all target languages by default', async () => {
      const result =
        await TranslationService.translateContent('test-content-id');

      expect(mockReadSource).toHaveBeenCalledWith('test-content-id');
      expect(mockTranslate).toHaveBeenCalledTimes(4); // 2 languages * 2 fields (title + content)
      expect(mockAddTranslation).toHaveBeenCalledTimes(2);
      expect(mockUpdateSourceStatus).toHaveBeenCalledWith(
        'test-content-id',
        'translated'
      );
      expect(result.results).toHaveProperty('en-US', 'Success');
      expect(result.results).toHaveProperty('ja-JP', 'Success');
      expect(result.errors).toHaveLength(0);
    });

    it('translates content to specific language when specified', async () => {
      const result = await TranslationService.translateContent(
        'test-content-id',
        'en-US'
      );

      expect(mockTranslate).toHaveBeenCalledTimes(2); // 1 language * 2 fields
      expect(mockAddTranslation).toHaveBeenCalledTimes(1);
      expect(result.results).toHaveProperty('en-US', 'Success');
      expect(result.results).not.toHaveProperty('ja-JP');
    });

    it('translates to all targets when "all" is specified', async () => {
      const result = await TranslationService.translateContent(
        'test-content-id',
        'all'
      );

      expect(mockTranslate).toHaveBeenCalledTimes(4); // 2 languages * 2 fields
      expect(mockAddTranslation).toHaveBeenCalledTimes(2);
      expect(Object.keys(result.results)).toHaveLength(2);
    });

    it('throws error when source content not found', async () => {
      mockReadSource.mockResolvedValue(null);

      await expect(
        TranslationService.translateContent('non-existent')
      ).rejects.toThrow('Source content not found: non-existent');
    });

    it('throws error when unsupported target language is specified', async () => {
      await expect(
        TranslationService.translateContent('test-content-id', 'fr-FR')
      ).rejects.toThrow('Unsupported target language: fr-FR');
    });

    it('handles translation failure for individual language gracefully', async () => {
      let callCount = 0;
      mockTranslate.mockImplementation(() => {
        callCount++;
        if (callCount > 2) {
          return Promise.reject(new Error('Translation API error'));
        }
        return Promise.resolve(['Translated text']);
      });

      const result =
        await TranslationService.translateContent('test-content-id');

      expect(result.results).toHaveProperty('en-US', 'Success');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('ja-JP');
      expect(result.errors[0]).toContain('Translation API error');
    });

    it('does not update source status when all translations fail', async () => {
      mockTranslate.mockRejectedValue(new Error('API unavailable'));

      const result =
        await TranslationService.translateContent('test-content-id');

      expect(result.results).toEqual({});
      expect(result.errors).toHaveLength(2);
      expect(mockUpdateSourceStatus).not.toHaveBeenCalled();
    });

    it('passes correct parameters to addTranslation', async () => {
      await TranslationService.translateContent('test-content-id', 'en-US');

      expect(mockAddTranslation).toHaveBeenCalledWith(
        'test-content-id',
        'en-US',
        expect.stringContaining('Translated'),
        expect.stringContaining('Translated'),
        'crypto',
        []
      );
    });
  });
});
