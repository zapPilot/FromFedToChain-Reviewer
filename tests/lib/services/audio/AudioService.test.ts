import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioService } from '@/lib/services/audio/AudioService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Mock GoogleTTSService
vi.mock('@/lib/services/audio/GoogleTTSService', () => {
  const mockSynthesizeSpeech = vi.fn();
  const mockPrepareContentForTTS = vi.fn();

  return {
    GoogleTTSService: class {
      synthesizeSpeech = mockSynthesizeSpeech;
      static prepareContentForTTS = mockPrepareContentForTTS;
    },
  };
});

const { mockSupabaseQuery } = vi.hoisted(() => {
  const query: any = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
  };
  // Chain the mocks
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.update.mockReturnValue(query);
  return { mockSupabaseQuery: query };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => mockSupabaseQuery),
  } as unknown as SupabaseClient)),
}));

// Mock language configuration
vi.mock('../../../../config/languages', () => ({
  getAudioLanguages: vi.fn(() => ['zh-TW', 'en-US', 'ja-JP']),
  getTTSConfig: vi.fn((language: string) => ({
    languageCode: language,
    name: `${language}-Wavenet`,
  })),
  shouldGenerateAudio: vi.fn(() => true),
  PATHS: {
    AUDIO_ROOT: './audio',
  },
}));

describe('AudioService', () => {
  let fsMock: any;
  let GoogleTTSServiceMock: any;

  beforeEach(async () => {
    // Get the mocked modules
    fsMock = await import('fs/promises');
    const ttsModule = await import('@/lib/services/audio/GoogleTTSService');
    GoogleTTSServiceMock = ttsModule.GoogleTTSService;

    vi.clearAllMocks();
    fsMock.default.mkdir.mockResolvedValue(undefined);
    fsMock.default.writeFile.mockResolvedValue(undefined);

    // Ensure chaining works
    mockSupabaseQuery.select.mockImplementation(() => mockSupabaseQuery);
    mockSupabaseQuery.eq.mockImplementation(() => mockSupabaseQuery);
    mockSupabaseQuery.update.mockImplementation(() => mockSupabaseQuery);

    // Ensure chaining works
    mockSupabaseQuery.select.mockImplementation(() => mockSupabaseQuery);
    mockSupabaseQuery.eq.mockImplementation(() => mockSupabaseQuery);
    mockSupabaseQuery.update.mockImplementation(() => mockSupabaseQuery);

    // Setup Google TTS mocks
    GoogleTTSServiceMock.prepareContentForTTS.mockImplementation((text: string) => text);
    GoogleTTSServiceMock.prototype.synthesizeSpeech = vi.fn().mockResolvedValue({
      audioContent: Buffer.from('mock-audio-data'),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateWavOnly', () => {
    it('successfully generates audio for all available languages', async () => {
      // Mock source content check (zh-TW)
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'test-content',
          language: 'zh-TW',
          status: 'translated',
        },
        error: null,
      });

      // Mock available languages query
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: [
          { language: 'zh-TW' },
          { language: 'en-US' },
          { language: 'ja-JP' },
        ],
        error: null,
      });

      // Mock content fetch for each language
      mockSupabaseQuery.single
        .mockResolvedValueOnce({
          data: {
            id: 'test-content',
            language: 'zh-TW',
            category: 'ethereum',
            content: 'Test content in Chinese',
            status: 'translated',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'test-content',
            language: 'en-US',
            category: 'ethereum',
            content: 'Test content in English',
            status: 'translated',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'test-content',
            language: 'ja-JP',
            category: 'ethereum',
            content: 'Test content in Japanese',
            status: 'translated',
          },
          error: null,
        });

      // Mock update queries
      mockSupabaseQuery.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await AudioService.generateWavOnly('test-content');

      expect(result['zh-TW'].success).toBe(true);
      expect(result['en-US'].success).toBe(true);
      expect(result['ja-JP'].success).toBe(true);
      expect(GoogleTTSServiceMock.prototype.synthesizeSpeech).toHaveBeenCalledTimes(3);
      expect(fsMock.default.writeFile).toHaveBeenCalledTimes(3);
    });

    it('throws error when content status is not translated', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'test-content',
          language: 'zh-TW',
          status: 'draft',
        },
        error: null,
      });

      await expect(
        AudioService.generateWavOnly('test-content')
      ).rejects.toThrow(
        'Content must be translated before audio generation. Current status: draft'
      );
    });

    it('throws error when source content not found', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        AudioService.generateWavOnly('test-content')
      ).rejects.toThrow('Content test-content not found or database error');
    });

    it('throws error when no languages configured for audio', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'test-content',
          language: 'zh-TW',
          status: 'translated',
        },
        error: null,
      });

      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await expect(
        AudioService.generateWavOnly('test-content')
      ).rejects.toThrow(
        'No languages configured for audio generation found for content: test-content'
      );
    });

    it('handles partial failures gracefully', async () => {
      // Mock source content check
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'test-content',
          language: 'zh-TW',
          status: 'translated',
        },
        error: null,
      });

      // Mock available languages
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: [{ language: 'zh-TW' }, { language: 'en-US' }],
        error: null,
      });

      // Mock first language success
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'test-content',
          language: 'zh-TW',
          category: 'ethereum',
          content: 'Test content',
          status: 'translated',
        },
        error: null,
      });

      // Mock second language failure
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Content not found' },
      });

      // Mock update for successful language
      mockSupabaseQuery.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await AudioService.generateWavOnly('test-content');

      expect(result['zh-TW'].success).toBe(true);
      expect(result['en-US'].success).toBe(false);
      expect(result['en-US'].error).toContain('No en-US content found');
    });
  });

  describe('saveAudioFile', () => {
    it('creates directory structure and saves file', async () => {
      const audioContent = Buffer.from('test-audio-data');
      const result = await AudioService.saveAudioFile(
        audioContent,
        'test-id',
        'en-US',
        'ethereum'
      );

      expect(fsMock.default.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('audio/en-US/ethereum'),
        { recursive: true }
      );
      expect(fsMock.default.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-id.wav'),
        audioContent
      );
      expect(result).toContain('test-id.wav');
    });

    it('returns correct file path format', async () => {
      const result = await AudioService.saveAudioFile(
        Buffer.from('data'),
        'content-123',
        'ja-JP',
        'macro'
      );

      expect(result).toMatch(/audio\/ja-JP\/macro\/content-123\.wav/);
    });
  });
});
