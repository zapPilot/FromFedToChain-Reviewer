
import { describe, it, expect } from 'vitest';
import { TextChunker } from '@/lib/services/audio/TextChunker';

describe('TextChunker', () => {
    describe('splitContentIntoChunks', () => {
        it('returns single chunk for short content', () => {
            const shortText = 'Short text';
            const chunks = TextChunker.splitContentIntoChunks(shortText);

            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe(shortText);
        });

        it('returns empty array for empty content', () => {
            const emptyText = '';
            const chunks = TextChunker.splitContentIntoChunks(emptyText);

            expect(chunks).toHaveLength(0);
        });

        it('splits very long content into multiple chunks', () => {
            // Create content longer than MAX_CHUNK_BYTES (4800)
            const longText = 'A'.repeat(10000);
            const chunks = TextChunker.splitContentIntoChunks(longText);

            expect(chunks.length).toBeGreaterThan(1);
            chunks.forEach((chunk: string) => {
                expect(Buffer.byteLength(chunk, 'utf8')).toBeLessThanOrEqual(4800);
            });
        });

        it('splits content by paragraphs when possible', () => {
            const paragraphs = [
                'First paragraph with some text.',
                'Second paragraph with some text.',
                'Third paragraph with some text.',
            ].join('\n\n');

            const chunks = TextChunker.splitContentIntoChunks(paragraphs);

            expect(chunks.length).toBeGreaterThan(0);
            // Should preserve paragraph boundaries
            expect(chunks.some((chunk: string) => chunk.includes('First'))).toBe(
                true
            );
        });
    });
});
