import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudflareR2Service } from '@/lib/services/pipeline/CloudflareR2Service';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock executeCommand
vi.mock('@/lib/utils/command-executor', () => ({
  executeCommand: vi.fn(),
}));

const { mockSupabaseQuery } = vi.hoisted(() => {
  const queues = {
    result: [] as Array<{ data: any; error: any }>,
  };
  const query: any = {
    select: vi.fn(),
    eq: vi.fn(),
    update: vi.fn(),
    __queues: queues,
    __queueResult: (value: { data: any; error: any }) => {
      queues.result.push(value);
    },
    __resetQueues: () => {
      queues.result.length = 0;
    },
  };
  query.then = (onFulfilled: any, onRejected: any) => {
    const result = queues.result.shift();
    return Promise.resolve(result).then(onFulfilled, onRejected);
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.update.mockReturnValue(query);
  return { mockSupabaseQuery: query };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => mockSupabaseQuery),
  })),
}));

// Mock language configuration
vi.mock('../../../../config/languages', () => ({
  getAudioLanguages: vi.fn(() => ['en-US', 'ja-JP']),
  shouldUploadToR2: vi.fn(() => true),
  PATHS: {
    AUDIO_ROOT: './audio',
  },
}));

describe('CloudflareR2Service', () => {
  let fsMock: any;
  let executeCommandMock: any;

  beforeEach(async () => {
    fsMock = await import('fs/promises');
    const commandMod = await import('@/lib/utils/command-executor');
    executeCommandMock = commandMod.executeCommand;

    vi.clearAllMocks();
    mockSupabaseQuery.__resetQueues();
    fsMock.default.access.mockResolvedValue(undefined);
    fsMock.default.readdir.mockResolvedValue([
      'playlist.m3u8',
      'segment_000.ts',
      'segment_001.ts',
    ]);

    mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.update.mockReturnValue(mockSupabaseQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadAudioToR2', () => {
    it('successfully uploads M3U8 files to R2', async () => {
      mockSupabaseQuery.__queueResult({
        data: [
          {
            id: 'test-content',
            language: 'en-US',
            category: 'ethereum',
            status: 'm3u8',
          },
        ],
        error: null,
      });

      mockSupabaseQuery.__queueResult({ data: null, error: null });

      (executeCommandMock as any).mockResolvedValue({
        success: true,
        output: '',
      });

      const result = await CloudflareR2Service.uploadAudioToR2('test-content');

      expect(result['en-US'].success).toBe(true);
      expect(result['en-US'].r2Url).toContain('playlist.m3u8');
      expect(result['en-US'].filesUploaded).toBe(3);
      expect(executeCommandMock).toHaveBeenCalledWith(
        'rclone',
        expect.any(Array)
      );
    });

    it('throws error when content fetch fails', async () => {
      mockSupabaseQuery.__queueResult({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        CloudflareR2Service.uploadAudioToR2('test-content')
      ).rejects.toThrow('Failed to fetch content test-content');
    });

    it('throws error when no eligible records found', async () => {
      mockSupabaseQuery.__queueResult({
        data: [
          {
            id: 'test-content',
            language: 'zh-TW', // Not in audio languages
            category: 'ethereum',
            status: 'draft',
          },
        ],
        error: null,
      });

      await expect(
        CloudflareR2Service.uploadAudioToR2('test-content')
      ).rejects.toThrow('No eligible content records found for R2 upload');
    });

    it('handles source directory not found error', async () => {
      mockSupabaseQuery.__queueResult({
        data: [
          {
            id: 'test-content',
            language: 'en-US',
            category: 'ethereum',
            status: 'm3u8',
          },
        ],
        error: null,
      });

      fsMock.default.access.mockRejectedValue(new Error('ENOENT'));

      const result = await CloudflareR2Service.uploadAudioToR2('test-content');

      expect(result['en-US'].success).toBe(false);
      expect(result['en-US'].error).toContain('Source directory not found');
    });

    it('handles no uploadable files error', async () => {
      mockSupabaseQuery.__queueResult({
        data: [
          {
            id: 'test-content',
            language: 'en-US',
            category: 'ethereum',
            status: 'm3u8',
          },
        ],
        error: null,
      });

      fsMock.default.readdir.mockResolvedValue(['readme.txt', 'other.wav']);

      const result = await CloudflareR2Service.uploadAudioToR2('test-content');

      expect(result['en-US'].success).toBe(false);
      expect(result['en-US'].error).toContain(
        'No M3U8 or TS files found in source directory'
      );
    });

    it('handles rclone failure gracefully', async () => {
      mockSupabaseQuery.__queueResult({
        data: [
          {
            id: 'test-content',
            language: 'en-US',
            category: 'ethereum',
            status: 'm3u8',
          },
        ],
        error: null,
      });

      (executeCommandMock as any).mockResolvedValue({
        success: false,
        error: 'rclone: authentication failed',
      });

      const result = await CloudflareR2Service.uploadAudioToR2('test-content');

      expect(result['en-US'].success).toBe(false);
      expect(result['en-US'].error).toContain('rclone failed');
    });

    it('handles database update failure gracefully', async () => {
      mockSupabaseQuery.__queueResult({
        data: [
          {
            id: 'test-content',
            language: 'en-US',
            category: 'ethereum',
            status: 'm3u8',
          },
        ],
        error: null,
      });

      (executeCommandMock as any).mockResolvedValue({
        success: true,
        output: '',
      });

      mockSupabaseQuery.__queueResult({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await CloudflareR2Service.uploadAudioToR2('test-content');

      expect(result['en-US'].success).toBe(false);
      expect(result['en-US'].error).toContain('Database update failed');
    });
  });

  describe('getStreamingUrl', () => {
    it('returns correct URL format', () => {
      const url = CloudflareR2Service.getStreamingUrl(
        'test-content',
        'en-US',
        'ethereum'
      );
      expect(url).toContain('audio/en-US/ethereum/test-content/playlist.m3u8');
      expect(url).toContain('r2.cloudflarestorage.com');
    });
  });
});
