
import { describe, it, expect } from 'vitest';
import { WavUtils } from '@/lib/services/audio/WavUtils';

describe('WavUtils', () => {
    describe('combineAudioChunks', () => {
        it('returns single chunk if only one provided', () => {
            const singleChunk = Buffer.from('single-chunk');
            const result = WavUtils.combineAudioChunks([singleChunk]);

            expect(result).toEqual(singleChunk);
        });

        it('throws error for empty chunks array', () => {
            expect(() => WavUtils.combineAudioChunks([])).toThrow(
                'No audio chunks to combine'
            );
        });

        it('combines multiple chunks correctly', () => {
            // Create two mock WAV chunks with headers
            const chunk1 = Buffer.alloc(100);
            chunk1.write('RIFF', 0);
            chunk1.writeUInt32LE(chunk1.length - 8, 4);
            chunk1.write('data', 36);
            chunk1.writeUInt32LE(chunk1.length - 44, 40);

            const chunk2 = Buffer.alloc(100);
            chunk2.write('RIFF', 0);
            chunk2.writeUInt32LE(chunk2.length - 8, 4);
            chunk2.write('data', 36);
            chunk2.writeUInt32LE(chunk2.length - 44, 40);

            const result = WavUtils.combineAudioChunks([chunk1, chunk2]);

            expect(result).toBeInstanceOf(Buffer);
            // Combined should be larger than first chunk but smaller than both chunks combined
            // (because we skip the second WAV header)
            expect(result.length).toBeGreaterThan(chunk1.length);
            expect(result.length).toBeLessThan(chunk1.length + chunk2.length);
        });
    });
});
