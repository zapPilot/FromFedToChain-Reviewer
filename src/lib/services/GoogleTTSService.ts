import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import path from 'path';
import type { google } from '@google-cloud/text-to-speech/build/protos/protos';

interface VoiceConfig {
  languageCode: string;
  name: string;
}

interface SynthesisResponse {
  audioContent: Buffer;
}

/**
 * GoogleTTSService - Handles text-to-speech synthesis using Google Cloud TTS
 */
export class GoogleTTSService {
  private client: TextToSpeechClient;

  constructor(client?: TextToSpeechClient) {
    if (client) {
      this.client = client;
      return;
    }

    const serviceAccountPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.resolve(process.cwd(), 'service-account.json');

    this.client = new TextToSpeechClient({
      keyFilename: serviceAccountPath,
    });
  }

  async synthesizeSpeech(
    text: string,
    voiceConfig: VoiceConfig
  ): Promise<SynthesisResponse> {
    // Check if content needs to be batched
    const chunks = this.splitContentIntoChunks(text);

    if (chunks.length === 1) {
      // Single chunk - use standard synthesis
      return await this.synthesizeSingleChunk(chunks[0], voiceConfig);
    } else {
      // Multiple chunks - batch process and combine
      console.log(
        `📝 Processing ${chunks.length} chunks for complete TTS audio`
      );
      return await this.synthesizeBatchedContent(chunks, voiceConfig);
    }
  }

  async synthesizeSingleChunk(
    text: string,
    voiceConfig: VoiceConfig
  ): Promise<SynthesisResponse> {
    const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { text },
      voice: {
        languageCode: voiceConfig.languageCode,
        name: voiceConfig.name,
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 16000,
      },
    };

    const [response] = await this.client.synthesizeSpeech(request);
    return {
      audioContent: response.audioContent as Buffer,
    };
  }

  async synthesizeBatchedContent(
    chunks: string[],
    voiceConfig: VoiceConfig
  ): Promise<SynthesisResponse> {
    const audioChunks: Buffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`🎙️ Synthesizing chunk ${i + 1}/${chunks.length}`);

      const response = await this.synthesizeSingleChunk(chunks[i], voiceConfig);
      audioChunks.push(response.audioContent);

      // Add small delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Combine audio chunks
    const combinedAudio = this.combineAudioChunks(audioChunks);

    return {
      audioContent: combinedAudio,
    };
  }

  combineAudioChunks(audioChunks: Buffer[]): Buffer {
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

  updateWAVHeader(buffer: Buffer): void {
    // Update file size in WAV header (bytes 4-7)
    const fileSize = buffer.length - 8;
    buffer.writeUInt32LE(fileSize, 4);

    // Update data chunk size (bytes 40-43)
    const dataSize = buffer.length - 44;
    buffer.writeUInt32LE(dataSize, 40);
  }

  splitContentIntoChunks(content: string): string[] {
    const MAX_CHUNK_BYTES = 4800; // Safe buffer under 5000 byte limit

    // If content is empty or only whitespace, return no chunks
    if (!content || content.trim().length === 0) {
      return [];
    }

    // If content is under limit, return as single chunk
    if (Buffer.byteLength(content, 'utf8') <= MAX_CHUNK_BYTES) {
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

      if (Buffer.byteLength(testChunk, 'utf8') <= MAX_CHUNK_BYTES) {
        currentChunk = testChunk;
      } else {
        // Current chunk is good, save it
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // Check if single paragraph is too large
        if (Buffer.byteLength(paragraph, 'utf8') > MAX_CHUNK_BYTES) {
          // Split paragraph by sentences
          const sentenceChunks = this.splitParagraphBySentences(
            paragraph,
            MAX_CHUNK_BYTES
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
      .flatMap((chunk) => this.ensureChunkSize(chunk, MAX_CHUNK_BYTES));
  }

  splitParagraphBySentences(paragraph: string, maxBytes: number): string[] {
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

  forceSplitText(text: string, maxBytes: number): string[] {
    // Last resort: split text at character boundaries into multiple chunks
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

  ensureChunkSize(chunk: string, maxBytes: number): string[] {
    if (Buffer.byteLength(chunk, 'utf8') <= maxBytes) {
      return [chunk];
    }
    return this.forceSplitText(chunk, maxBytes);
  }

  static prepareContentForTTS(content: string, language: string): string {
    // Clean content for TTS - removes markdown formatting and optimizes for speech
    if (typeof content !== 'string') {
      return content;
    }

    let ttsContent = content
      // Remove code blocks first (must be before inline code)
      .replace(/```[\s\S]*?```/g, '') // Remove multi-line code blocks

      // Remove markdown formatting but preserve the text content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold: **text** -> text
      .replace(/\*(.*?)\*/g, '$1') // Remove italic: *text* -> text
      .replace(/`([^`]*)`/g, '$1') // Remove inline code: `text` -> text
      .replace(/#{1,6}\s+/g, '') // Remove headers: ## Header -> Header
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links: [text](url) -> text
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers: - item -> item

      // Clean up line breaks and spacing
      .replace(/\n{3,}/g, '\n\n') // Normalize excessive line breaks
      .replace(/\n\n/g, ' ') // Replace double newlines with space
      .replace(/\n/g, ' ') // Replace single newlines with space
      .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
      .trim(); // Remove leading/trailing whitespace

    // Add pauses for better speech flow
    ttsContent = ttsContent.replace(/([.!?])\s+([A-Z])/g, '$1 ... $2'); // Add pause between sentences

    return ttsContent;
  }
}
