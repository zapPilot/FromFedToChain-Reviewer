import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleTTSService } from '@/lib/services/audio/GoogleTTSService';

// Mock @google-cloud/text-to-speech
const mockSynthesizeSpeech = vi.fn();
vi.mock('@google-cloud/text-to-speech', () => {
  return {
    TextToSpeechClient: vi.fn(() => ({
      synthesizeSpeech: mockSynthesizeSpeech,
    })),
  };
});

describe('GoogleTTSService', () => {
  let service: GoogleTTSService;
  const mockVoiceConfig = {
    languageCode: 'en-US',
    name: 'en-US-Neural2-A',
  };

  beforeEach(() => {
    mockSynthesizeSpeech.mockReset();
    service = new GoogleTTSService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('synthesizeSpeech', () => {
    it('synthesizes short text in a single chunk', async () => {
      const shortText = 'Hello world';
      const mockAudioContent = Buffer.from('mock-audio-data');

      mockSynthesizeSpeech.mockResolvedValueOnce([
        { audioContent: mockAudioContent },
      ]);

      const result = await service.synthesizeSpeech(shortText, mockVoiceConfig);

      expect(result.audioContent).toEqual(mockAudioContent);
      expect(mockSynthesizeSpeech).toHaveBeenCalledTimes(1);
      expect(mockSynthesizeSpeech).toHaveBeenCalledWith({
        input: { text: shortText },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-A',
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          sampleRateHertz: 16000,
        },
      });
    });

    it('synthesizes long text in multiple chunks', async () => {
      // Create a long text that will be split into chunks
      const longText = 'A'.repeat(5000);

      const mockAudioChunk1 = Buffer.alloc(100, 'a');
      const mockAudioChunk2 = Buffer.alloc(100, 'b');
      const mockAudioChunk3 = Buffer.alloc(100, 'c');

      // Add WAV headers to the mock chunks
      mockAudioChunk1.write('RIFF', 0);
      mockAudioChunk1.writeUInt32LE(mockAudioChunk1.length - 8, 4);
      mockAudioChunk1.write('data', 36);
      mockAudioChunk1.writeUInt32LE(mockAudioChunk1.length - 44, 40);

      mockAudioChunk2.write('RIFF', 0);
      mockAudioChunk2.writeUInt32LE(mockAudioChunk2.length - 8, 4);
      mockAudioChunk2.write('data', 36);
      mockAudioChunk2.writeUInt32LE(mockAudioChunk2.length - 44, 40);

      mockAudioChunk3.write('RIFF', 0);
      mockAudioChunk3.writeUInt32LE(mockAudioChunk3.length - 8, 4);
      mockAudioChunk3.write('data', 36);
      mockAudioChunk3.writeUInt32LE(mockAudioChunk3.length - 44, 40);

      mockSynthesizeSpeech
        .mockResolvedValueOnce([{ audioContent: mockAudioChunk1 }])
        .mockResolvedValueOnce([{ audioContent: mockAudioChunk2 }])
        .mockResolvedValueOnce([{ audioContent: mockAudioChunk3 }]);

      const result = await service.synthesizeSpeech(longText, mockVoiceConfig);

      expect(mockSynthesizeSpeech).toHaveBeenCalledTimes(3);
      expect(result.audioContent).toBeInstanceOf(Buffer);
      expect(result.audioContent.length).toBeGreaterThan(0);
    });
  });

  describe('prepareContentForTTS', () => {
    it('removes markdown bold formatting', () => {
      const input = 'This is **bold** text';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('This is bold text');
    });

    it('removes markdown italic formatting', () => {
      const input = 'This is *italic* text';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('This is italic text');
    });

    it('removes inline code formatting', () => {
      const input = 'Run `npm install` command';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('Run npm install command');
    });

    it('removes code blocks', () => {
      const input = 'Here is code:\n```js\nconst x = 1;\n```\nEnd';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('Here is code: End');
    });

    it('removes header markers', () => {
      const input = '## Section Title\nContent here';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('Section Title Content here');
    });

    it('removes link formatting but keeps link text', () => {
      const input = 'Click [here](https://example.com) to continue';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('Click here to continue');
    });

    it('removes list markers', () => {
      const input = '- Item 1\n- Item 2\n- Item 3';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('Item 1 Item 2 Item 3');
    });

    it('normalizes excessive line breaks', () => {
      const input = 'Line 1\n\n\n\nLine 2';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('Line 1 Line 2');
    });

    it('adds pauses between sentences', () => {
      const input = 'First sentence. Second sentence';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toContain('...');
    });

    it('handles empty or non-string content', () => {
      const result = GoogleTTSService.prepareContentForTTS('', 'en');
      expect(result).toBe('');
    });

    it('removes multiple spaces', () => {
      const input = 'Text   with    many     spaces';
      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).toBe('Text with many spaces');
    });

    it('handles complex markdown with multiple formatting', () => {
      const input = `
## Title

This is **bold** and *italic* text.

- First item
- Second item with \`code\`
- Third [link](https://example.com)

\`\`\`javascript
const x = 1;
\`\`\`

End of content.
      `.trim();

      const result = GoogleTTSService.prepareContentForTTS(input, 'en');
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
      expect(result).not.toContain('`');
      expect(result).not.toContain('##');
      expect(result).not.toContain('-');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).not.toContain('const x = 1');
      expect(result).toContain('Title');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('First item');
      expect(result).toContain('code');
      expect(result).toContain('link');
      expect(result).toContain('End of content');
    });
  });

  describe('splitContentIntoChunks', () => {
    it('returns single chunk for short content', () => {
      const service = new GoogleTTSService();
      const shortText = 'Short text';
      // Access private method via type assertion for testing
      const chunks = (service as any).splitContentIntoChunks(shortText);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(shortText);
    });

    it('returns empty array for empty content', () => {
      const service = new GoogleTTSService();
      const emptyText = '';
      const chunks = (service as any).splitContentIntoChunks(emptyText);

      expect(chunks).toHaveLength(0);
    });

    it('splits very long content into multiple chunks', () => {
      const service = new GoogleTTSService();
      // Create content longer than MAX_CHUNK_BYTES (4800)
      const longText = 'A'.repeat(10000);
      const chunks = (service as any).splitContentIntoChunks(longText);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk: string) => {
        expect(Buffer.byteLength(chunk, 'utf8')).toBeLessThanOrEqual(4800);
      });
    });

    it('splits content by paragraphs when possible', () => {
      const service = new GoogleTTSService();
      const paragraphs = [
        'First paragraph with some text.',
        'Second paragraph with some text.',
        'Third paragraph with some text.',
      ].join('\n\n');

      const chunks = (service as any).splitContentIntoChunks(paragraphs);

      expect(chunks.length).toBeGreaterThan(0);
      // Should preserve paragraph boundaries
      expect(chunks.some((chunk: string) => chunk.includes('First'))).toBe(
        true
      );
    });
  });

  describe('combineAudioChunks', () => {
    it('returns single chunk if only one provided', () => {
      const service = new GoogleTTSService();
      const singleChunk = Buffer.from('single-chunk');
      const result = (service as any).combineAudioChunks([singleChunk]);

      expect(result).toEqual(singleChunk);
    });

    it('throws error for empty chunks array', () => {
      const service = new GoogleTTSService();
      expect(() => (service as any).combineAudioChunks([])).toThrow(
        'No audio chunks to combine'
      );
    });

    it('combines multiple chunks correctly', () => {
      const service = new GoogleTTSService();

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

      const result = (service as any).combineAudioChunks([chunk1, chunk2]);

      expect(result).toBeInstanceOf(Buffer);
      // Combined should be larger than first chunk but smaller than both chunks combined
      // (because we skip the second WAV header)
      expect(result.length).toBeGreaterThan(chunk1.length);
      expect(result.length).toBeLessThan(chunk1.length + chunk2.length);
    });
  });
});
