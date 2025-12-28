import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import path from 'path';
import { TextChunker } from './TextChunker';
import { WavUtils } from './WavUtils';

interface VoiceConfig {
  languageCode: string;
  name: string;
}

interface SynthesisResponse {
  audioContent: Buffer;
}

export class GoogleTTSService {
  private client: TextToSpeechClient;

  constructor() {
    // Use GOOGLE_APPLICATION_CREDENTIALS env var if set (CI environment),
    // otherwise fall back to local service-account.json file
    const serviceAccountPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.resolve(process.cwd(), 'service-account.json');

    this.client = new TextToSpeechClient({
      keyFilename: serviceAccountPath,
      // projectId will be automatically inferred from service account file
    });
  }

  async synthesizeSpeech(
    text: string,
    voiceConfig: VoiceConfig
  ): Promise<SynthesisResponse> {
    // Check if content needs to be batched
    const chunks = TextChunker.splitContentIntoChunks(text);

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

  private async synthesizeSingleChunk(
    text: string,
    voiceConfig: VoiceConfig
  ): Promise<SynthesisResponse> {
    const request = {
      input: { text },
      voice: {
        languageCode: voiceConfig.languageCode,
        name: voiceConfig.name,
      },
      audioConfig: {
        audioEncoding: 'LINEAR16' as const,
        sampleRateHertz: 16000,
      },
    };

    const [response] = await this.client.synthesizeSpeech(request);
    return response as SynthesisResponse;
  }

  private async synthesizeBatchedContent(
    chunks: string[],
    voiceConfig: VoiceConfig
  ): Promise<SynthesisResponse> {
    const audioChunks: Buffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`🎙️ Synthesizing chunk ${i + 1}/${chunks.length}`);

      const response = await this.synthesizeSingleChunk(chunks[i], voiceConfig);
      audioChunks.push(response.audioContent as Buffer);

      // Add small delay between requests to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Combine audio chunks
    const combinedAudio = WavUtils.combineAudioChunks(audioChunks);

    return {
      audioContent: combinedAudio,
    };
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
      .replace(/`([^`]*)`/g, '$1') // Remove inline code: `text` -> text (improved)
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

