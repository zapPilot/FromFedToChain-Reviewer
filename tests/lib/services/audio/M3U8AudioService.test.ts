import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { M3U8AudioService } from '@/lib/services/audio/M3U8AudioService';

// Mock fs/promises
vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn(),
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
    getM3U8Config: vi.fn(() => ({
        segmentDuration: 10,
    })),
    shouldGenerateM3U8: vi.fn(() => true),
    PATHS: {
        AUDIO_ROOT: './audio',
    },
}));

describe('M3U8AudioService', () => {
    let fsMock: any;
    let executeCommandMock: any;

    beforeEach(async () => {
        fsMock = await import('fs/promises');
        const commandMod = await import('@/lib/utils/command-executor');
        executeCommandMock = commandMod.executeCommand;

        vi.clearAllMocks();
        mockSupabaseQuery.__resetQueues();
        fsMock.default.mkdir.mockResolvedValue(undefined);
        fsMock.default.readdir.mockResolvedValue(['segment_000.ts', 'segment_001.ts', 'playlist.m3u8']);

        mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
        mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
        mockSupabaseQuery.update.mockReturnValue(mockSupabaseQuery);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('convertToM3U8', () => {
        it('successfully converts WAV to M3U8 for eligible languages', async () => {
            // Mock content records fetch
            mockSupabaseQuery.__queueResult({
                data: [
                    {
                        id: 'test-content',
                        language: 'en-US',
                        category: 'ethereum',
                        audio_file: 'audio/en-US/ethereum/test-content.wav',
                        status: 'wav',
                    },
                ],
                error: null,
            });

            // Mock update query
            mockSupabaseQuery.__queueResult({ data: null, error: null });

            // Mock FFmpeg success
            (executeCommandMock as any).mockResolvedValue({
                success: true,
                output: '',
            });

            const result = await M3U8AudioService.convertToM3U8('test-content');

            expect(result['en-US'].success).toBe(true);
            expect(result['en-US'].m3u8Path).toContain('playlist.m3u8');
            expect(result['en-US'].segmentCount).toBe(2);
            expect(executeCommandMock).toHaveBeenCalledWith('ffmpeg', expect.any(Array));
        });

        it('throws error when content fetch fails', async () => {
            mockSupabaseQuery.__queueResult({
                data: null,
                error: { message: 'Database error' },
            });

            await expect(M3U8AudioService.convertToM3U8('test-content')).rejects.toThrow(
                'Failed to fetch content test-content'
            );
        });

        it('throws error when no eligible WAV files found', async () => {
            mockSupabaseQuery.__queueResult({
                data: [
                    {
                        id: 'test-content',
                        language: 'zh-TW', // Not in audio languages
                        category: 'ethereum',
                        audio_file: null,
                        status: 'draft',
                    },
                ],
                error: null,
            });

            await expect(M3U8AudioService.convertToM3U8('test-content')).rejects.toThrow(
                'No eligible WAV files found for M3U8 conversion'
            );
        });

        it('handles FFmpeg failure gracefully', async () => {
            mockSupabaseQuery.__queueResult({
                data: [
                    {
                        id: 'test-content',
                        language: 'en-US',
                        category: 'ethereum',
                        audio_file: 'audio/en-US/ethereum/test-content.wav',
                        status: 'wav',
                    },
                ],
                error: null,
            });

            (executeCommandMock as any).mockResolvedValue({
                success: false,
                error: 'FFmpeg failed: codec error',
            });

            const result = await M3U8AudioService.convertToM3U8('test-content');

            expect(result['en-US'].success).toBe(false);
            expect(result['en-US'].error).toContain('FFmpeg failed');
        });

        it('handles database update failure gracefully', async () => {
            mockSupabaseQuery.__queueResult({
                data: [
                    {
                        id: 'test-content',
                        language: 'en-US',
                        category: 'ethereum',
                        audio_file: 'audio/en-US/ethereum/test-content.wav',
                        status: 'wav',
                    },
                ],
                error: null,
            });

            (executeCommandMock as any).mockResolvedValue({
                success: true,
                output: '',
            });

            // Mock update failure
            mockSupabaseQuery.__queueResult({
                data: null,
                error: { message: 'Update failed' },
            });

            const result = await M3U8AudioService.convertToM3U8('test-content');

            expect(result['en-US'].success).toBe(false);
            expect(result['en-US'].error).toContain('Database update failed');
        });
    });

    describe('getM3U8Path', () => {
        it('returns correct path format', () => {
            const path = M3U8AudioService.getM3U8Path('test-content', 'en-US', 'ethereum');
            expect(path).toContain('m3u8');
            expect(path).toContain('en-US');
            expect(path).toContain('ethereum');
            expect(path).toContain('test-content');
            expect(path).toContain('playlist.m3u8');
        });
    });
});
