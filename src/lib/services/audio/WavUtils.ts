
/**
 * WavUtils
 * 
 * Utility functions for working with WAV audio files.
 * Provides functionality to combine multiple WAV buffers and update headers.
 */
export class WavUtils {
    /**
     * Combine multiple WAV audio buffers into a single buffer
     * Handles skipping headers of subsequent chunks and updating the final header
     */
    static combineAudioChunks(audioChunks: Buffer[]): Buffer {
        if (!audioChunks || audioChunks.length === 0) {
            throw new Error('No audio chunks to combine');
        }

        if (audioChunks.length === 1) {
            return audioChunks[0];
        }

        // For LINEAR16 format, we can simply concatenate the audio data
        // Skip WAV headers (first 44 bytes) for all chunks except the first
        let totalLength = audioChunks[0].length;

        // Calculate total length (first chunk + data portion of subsequent chunks)
        for (let i = 1; i < audioChunks.length; i++) {
            const chunk = audioChunks[i];
            if (chunk.length > 44) {
                totalLength += chunk.length - 44; // Skip WAV header
            } else {
                // If chunk is too small to have a WAV header, just add it as-is
                totalLength += chunk.length;
            }
        }

        // Create combined buffer
        const combinedBuffer = Buffer.alloc(totalLength);
        let offset = 0;

        // Copy first chunk completely (including WAV header)
        audioChunks[0].copy(combinedBuffer, offset);
        offset += audioChunks[0].length;

        // Copy subsequent chunks without headers
        for (let i = 1; i < audioChunks.length; i++) {
            const chunk = audioChunks[i];
            if (chunk.length > 44) {
                // Normal case: skip WAV header
                chunk.copy(combinedBuffer, offset, 44);
                offset += chunk.length - 44;
            } else {
                // Edge case: chunk too small to have header, copy as-is
                chunk.copy(combinedBuffer, offset);
                offset += chunk.length;
            }
        }

        // Update WAV header with new file size
        this.updateWAVHeader(combinedBuffer);

        return combinedBuffer;
    }

    /**
     * Update size fields in the WAV header
     */
    private static updateWAVHeader(buffer: Buffer): void {
        // Update file size in WAV header (bytes 4-7)
        const fileSize = buffer.length - 8;
        buffer.writeUInt32LE(fileSize, 4);

        // Update data chunk size (bytes 40-43)
        const dataSize = buffer.length - 44;
        buffer.writeUInt32LE(dataSize, 40);
    }
}
