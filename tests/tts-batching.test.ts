import { describe, it, beforeEach, expect, vi } from 'vitest';
import { GoogleTTSService } from '@/lib/services/GoogleTTSService';

const createMockAudio = (size = 512) => {
  const buffer = Buffer.alloc(size);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(size - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(size - 44, 40);
  return buffer;
};

describe('GoogleTTSService', () => {
  let service: GoogleTTSService;
  let mockClient: { synthesizeSpeech: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockClient = {
      synthesizeSpeech: vi.fn(),
    };
    service = new GoogleTTSService(mockClient as any);
  });

  describe('splitContentIntoChunks', () => {
    it('returns single chunk for short input', () => {
      const chunks = service.splitContentIntoChunks('short content');
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('short content');
    });

    it('splits large paragraphs into multiple chunks', () => {
      const longParagraph =
        'This is a sentence forming a very long paragraph. '.repeat(400);
      const chunks = service.splitContentIntoChunks(longParagraph);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(Buffer.byteLength(chunk, 'utf8')).toBeLessThanOrEqual(4800);
      });
    });

    it('handles mixed paragraph sizes', () => {
      const content = [
        'Short paragraph.',
        'Medium paragraph with extra sentences. '.repeat(40),
        'Long paragraph '.repeat(400),
        'Final short paragraph.',
      ].join('\n\n');
      const chunks = service.splitContentIntoChunks(content);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => expect(chunk.trim().length).toBeGreaterThan(0));
    });
  });

  describe('synthesizeSpeech', () => {
    it('synthesizes single chunk without batching', async () => {
      const audio = createMockAudio(256);
      mockClient.synthesizeSpeech.mockResolvedValue([{ audioContent: audio }]);

      const result = await service.synthesizeSpeech('Hello world!', {
        languageCode: 'en-US',
        name: 'en-US-Wavenet-D',
      });

      expect(mockClient.synthesizeSpeech).toHaveBeenCalledTimes(1);
      expect(result.audioContent).toEqual(audio);
    });

    it('processes multiple chunks and combines audio', async () => {
      const chunkBuffers = [createMockAudio(400), createMockAudio(500)];
      let callIndex = 0;
      mockClient.synthesizeSpeech.mockImplementation(() => {
        const buffer = chunkBuffers[callIndex % chunkBuffers.length];
        callIndex += 1;
        return Promise.resolve([{ audioContent: buffer }]);
      });

      const largeContent = Array(400)
        .fill('This paragraph will trigger chunking. ')
        .join('');

      vi.useFakeTimers();
      const resultPromise = service.synthesizeSpeech(largeContent, {
        languageCode: 'en-US',
        name: 'en-US-Wavenet-D',
      });
      await vi.runAllTimersAsync();
      vi.useRealTimers();
      const result = await resultPromise;

      expect(mockClient.synthesizeSpeech).toHaveBeenCalled();
      expect(mockClient.synthesizeSpeech.mock.calls.length).toBeGreaterThan(1);
      expect(result.audioContent.length).toBeGreaterThan(
        chunkBuffers[0].length
      );
    });

    it('propagates errors from TTS client', async () => {
      mockClient.synthesizeSpeech.mockRejectedValue(
        new Error('quota exceeded')
      );
      await expect(
        service.synthesizeSpeech('content that needs batching'.repeat(50), {
          languageCode: 'en-US',
          name: 'en-US-Wavenet-D',
        })
      ).rejects.toThrow('quota exceeded');
    });
  });

  describe('audio utilities', () => {
    it('combines wav chunks and updates header', () => {
      const combined = service.combineAudioChunks([
        createMockAudio(300),
        createMockAudio(280),
      ]);

      expect(combined.toString('ascii', 0, 4)).toBe('RIFF');
      const fileSize = combined.readUInt32LE(4);
      expect(fileSize).toBe(combined.length - 8);
    });

    it('throws when combining empty chunk array', () => {
      expect(() => service.combineAudioChunks([])).toThrow(
        'No audio chunks to combine'
      );
    });
  });

  describe('content preparation', () => {
    it('cleans markdown from content before TTS', () => {
      const prepared = GoogleTTSService.prepareContentForTTS(
        '# Title\n\nThis is **bold** and [link](https://example.com).'
      );
      expect(prepared).not.toContain('**');
      expect(prepared).not.toContain('[');
      expect(prepared).toContain('Title');
    });
  });
});
