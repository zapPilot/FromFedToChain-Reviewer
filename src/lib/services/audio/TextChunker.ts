
/**
 * TextChunker
 * 
 * Utility for splitting text content into manageable chunks for TTS processing.
 * Handles splitting by paragraphs, sentences, and force splitting if necessary.
 */
export class TextChunker {
    private static readonly MAX_CHUNK_BYTES = 4800; // Safe buffer under 5000 byte limit

    /**
     * Split content into chunks that fit within the byte limit
     */
    static splitContentIntoChunks(content: string, maxBytes: number = this.MAX_CHUNK_BYTES): string[] {
        // If content is empty or only whitespace, return no chunks
        if (!content || content.trim().length === 0) {
            return [];
        }

        // If content is under limit, return as single chunk
        if (Buffer.byteLength(content, 'utf8') <= maxBytes) {
            return [content];
        }

        const chunks: string[] = [];

        // First, try to split by paragraphs
        const paragraphs = content.split(/\n\s*\n/);
        let currentChunk = '';

        for (const paragraph of paragraphs) {
            const testChunk = currentChunk
                ? currentChunk + '\n\n' + paragraph
                : paragraph;

            if (Buffer.byteLength(testChunk, 'utf8') <= maxBytes) {
                currentChunk = testChunk;
            } else {
                // Current chunk is good, save it
                if (currentChunk) {
                    chunks.push(currentChunk);
                }

                // Check if single paragraph is too large
                if (Buffer.byteLength(paragraph, 'utf8') > maxBytes) {
                    // Split paragraph by sentences
                    const sentenceChunks = this.splitParagraphBySentences(
                        paragraph,
                        maxBytes
                    );
                    chunks.push(...sentenceChunks);
                    currentChunk = '';
                } else {
                    currentChunk = paragraph;
                }
            }
        }

        // Add remaining chunk
        if (currentChunk) {
            chunks.push(currentChunk);
        }

        // Ensure no chunk is empty and all are under limit
        return chunks
            .filter((chunk) => chunk.trim().length > 0)
            .flatMap((chunk) => this.ensureChunkSize(chunk, maxBytes));
    }

    /**
     * Split a large paragraph by sentences
     */
    private static splitParagraphBySentences(
        paragraph: string,
        maxBytes: number
    ): string[] {
        const sentences = paragraph.split(/[.!?]+\s+/);
        const chunks: string[] = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            const testChunk = currentChunk
                ? currentChunk + '. ' + sentence
                : sentence;

            if (Buffer.byteLength(testChunk, 'utf8') <= maxBytes) {
                currentChunk = testChunk;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk + '.');
                }

                // If single sentence is too large, force split
                if (Buffer.byteLength(sentence, 'utf8') > maxBytes) {
                    chunks.push(...this.forceSplitText(sentence, maxBytes));
                    currentChunk = '';
                } else {
                    currentChunk = sentence;
                }
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk + (currentChunk.match(/[.!?]$/) ? '' : '.'));
        }

        return chunks;
    }

    /**
     * Last resort: split text at character boundaries
     */
    private static forceSplitText(text: string, maxBytes: number): string[] {
        const chunks: string[] = [];
        let remaining = text;

        while (remaining.length > 0) {
            let chunk = remaining;

            // Find the largest chunk that fits
            while (Buffer.byteLength(chunk, 'utf8') > maxBytes && chunk.length > 0) {
                chunk = chunk.substring(0, chunk.length - 10);
            }

            if (chunk.length === 0) {
                // Edge case: even 10 characters exceed limit
                chunk = remaining.substring(0, 1);
            }

            chunks.push(chunk + (remaining.length > chunk.length ? '...' : ''));
            remaining = remaining.substring(chunk.length);
        }

        return chunks;
    }

    /**
     * Ensure a chunk fits within the size limit, splitting if needed
     */
    private static ensureChunkSize(chunk: string, maxBytes: number): string[] {
        if (Buffer.byteLength(chunk, 'utf8') <= maxBytes) {
            return [chunk];
        }
        return this.forceSplitText(chunk, maxBytes);
    }
}
