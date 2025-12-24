import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentPipelineService } from '@/lib/services/pipeline/ContentPipelineService';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    rm: vi.fn(),
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
  PATHS: {
    CONTENT_ROOT: './content',
  },
}));

describe('ContentPipelineService', () => {
  let fsMock: any;
  let executeCommandMock: any;

  beforeEach(async () => {
    fsMock = await import('fs/promises');
    const commandMod = await import('@/lib/utils/command-executor');
    executeCommandMock = commandMod.executeCommand;

    vi.clearAllMocks();
    mockSupabaseQuery.__resetQueues();
    fsMock.default.mkdir.mockResolvedValue(undefined);
    fsMock.default.writeFile.mockResolvedValue(undefined);
    fsMock.default.rm.mockResolvedValue(undefined);

    mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.update.mockReturnValue(mockSupabaseQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadContentToCloudflare', () => {
    const mockContentRecord = {
      id: 'test-content',
      language: 'en-US',
      category: 'ethereum',
      status: 'cloudflare',
      date: '2025-01-01',
      title: 'Test Title',
      content: 'Test content text',
      references: ['ref1'],
      framework: 'crypto',
      knowledge_concepts_used: [],
      audio_file: 'audio/en-US/ethereum/test-content.wav',
      social_hook: null,
      feedback: { content_review: null },
    };

    it('successfully uploads content JSON to R2', async () => {
      mockSupabaseQuery.__queueResult({
        data: [mockContentRecord],
        error: null,
      });

      // Mock listR2Segments response
      (executeCommandMock as any)
        .mockResolvedValueOnce({
          success: true,
          output: '  1234 segment_000.ts\n  1234 segment_001.ts',
        })
        // Mock rclone copyto
        .mockResolvedValueOnce({
          success: true,
          output: '',
        });

      mockSupabaseQuery.__queueResult({ data: null, error: null });

      const result =
        await ContentPipelineService.uploadContentToCloudflare('test-content');

      expect(result['en-US'].success).toBe(true);
      expect(result['en-US'].contentUrl).toContain('test-content.json');
      expect(fsMock.default.writeFile).toHaveBeenCalled();
      expect(fsMock.default.rm).toHaveBeenCalled();
    });

    it('throws error when content fetch fails', async () => {
      mockSupabaseQuery.__queueResult({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        ContentPipelineService.uploadContentToCloudflare('test-content')
      ).rejects.toThrow('Failed to fetch content test-content');
    });

    it('throws error when no eligible content found', async () => {
      mockSupabaseQuery.__queueResult({
        data: [
          {
            ...mockContentRecord,
            language: 'zh-TW', // Not in audio languages
            status: 'draft',
          },
        ],
        error: null,
      });

      await expect(
        ContentPipelineService.uploadContentToCloudflare('test-content')
      ).rejects.toThrow('No eligible content found for upload');
    });

    it('handles rclone upload failure gracefully', async () => {
      mockSupabaseQuery.__queueResult({
        data: [mockContentRecord],
        error: null,
      });

      (executeCommandMock as any)
        .mockResolvedValueOnce({
          success: true,
          output: '',
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Upload failed',
        });

      const result =
        await ContentPipelineService.uploadContentToCloudflare('test-content');

      expect(result['en-US'].success).toBe(false);
      expect(result['en-US'].error).toContain('rclone failed');
    });

    it('handles database update failure gracefully', async () => {
      mockSupabaseQuery.__queueResult({
        data: [mockContentRecord],
        error: null,
      });

      (executeCommandMock as any)
        .mockResolvedValueOnce({
          success: true,
          output: '',
        })
        .mockResolvedValueOnce({
          success: true,
          output: '',
        });

      mockSupabaseQuery.__queueResult({
        data: null,
        error: { message: 'Update failed' },
      });

      const result =
        await ContentPipelineService.uploadContentToCloudflare('test-content');

      expect(result['en-US'].success).toBe(false);
      expect(result['en-US'].error).toContain('Database update failed');
    });
  });

  describe('getContentUrl', () => {
    it('returns correct URL format', () => {
      const url = ContentPipelineService.getContentUrl(
        'test-content',
        'en-US',
        'ethereum'
      );
      expect(url).toContain('content/en-US/ethereum/test-content.json');
      expect(url).toContain('r2.cloudflarestorage.com');
    });
  });

  describe('listR2Segments', () => {
    it('parses rclone ls output correctly', async () => {
      (executeCommandMock as any).mockResolvedValue({
        success: true,
        output:
          '  12345 segment_000.ts\n  12345 segment_001.ts\n  500 playlist.m3u8',
      });

      const segments = await ContentPipelineService.listR2Segments(
        'en-US',
        'ethereum',
        'test-content'
      );

      expect(segments).toHaveLength(2);
      expect(segments[0]).toContain('segment_000.ts');
      expect(segments[1]).toContain('segment_001.ts');
    });

    it('returns empty array when rclone fails', async () => {
      (executeCommandMock as any).mockResolvedValue({
        success: false,
        error: 'R2 not configured',
      });

      const segments = await ContentPipelineService.listR2Segments(
        'en-US',
        'ethereum',
        'test-content'
      );

      expect(segments).toEqual([]);
    });

    it('sorts segments numerically', async () => {
      (executeCommandMock as any).mockResolvedValue({
        success: true,
        output:
          '  100 segment_010.ts\n  100 segment_002.ts\n  100 segment_001.ts',
      });

      const segments = await ContentPipelineService.listR2Segments(
        'en-US',
        'ethereum',
        'test-content'
      );

      expect(segments[0]).toContain('segment_001.ts');
      expect(segments[1]).toContain('segment_002.ts');
      expect(segments[2]).toContain('segment_010.ts');
    });

    it('handles empty R2 directory', async () => {
      (executeCommandMock as any).mockResolvedValue({
        success: true,
        output: '',
      });

      const segments = await ContentPipelineService.listR2Segments(
        'en-US',
        'ethereum',
        'test-content'
      );

      expect(segments).toEqual([]);
    });
  });
});
