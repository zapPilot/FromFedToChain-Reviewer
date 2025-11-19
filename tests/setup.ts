import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { afterEach } from 'vitest';
import type { ContentItem, Language, Status } from '@/types/content';

export const FIXED_NOW = new Date('2025-07-01T00:00:00.000Z');

export class TestUtils {
  static createContent(overrides: Partial<ContentItem> = {}): ContentItem {
    const base: ContentItem = {
      id: '2025-07-01-test',
      status: 'draft',
      category: 'daily-news',
      date: '2025-07-01',
      language: 'zh-TW',
      title: '測試標題',
      content: '這是一段用於測試的內容。',
      references: ['測試來源'],
      framework: 'crypto',
      audio_file: null,
      social_hook: null,
      feedback: {
        content_review: null,
      },
      updated_at: FIXED_NOW.toISOString(),
      knowledge_concepts_used: [],
      streaming_urls: undefined,
    };

    return { ...base, ...overrides };
  }

  static async createTempDir(prefix = 'review-web-test-'): Promise<string> {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    return tmpRoot;
  }

  static async cleanupTempDir(dir?: string | null) {
    if (!dir) return;
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // ignore cleanup errors
    }
  }

  static async writeContentFile(rootDir: string, content: ContentItem) {
    const dir = path.join(rootDir, content.language, content.category);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${content.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
    return filePath;
  }

  static async seedContentSet(rootDir: string, contents: ContentItem[]) {
    return Promise.all(
      contents.map((content) => this.writeContentFile(rootDir, content))
    );
  }

  static createTranslation(
    source: ContentItem,
    language: Language,
    overrides: Partial<ContentItem> = {}
  ): ContentItem {
    return this.createContent({
      ...source,
      language,
      status: source.status,
      title: `Translated ${source.title} (${language})`,
      content: `Translation of ${source.content} into ${language}`,
      id: source.id,
      ...overrides,
    });
  }

  static advanceStatus(content: ContentItem, status: Status): ContentItem {
    return { ...content, status, updated_at: new Date().toISOString() };
  }

  static createAudioBuffer(size = 2048) {
    const buffer = Buffer.alloc(size);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(size - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(44100, 24);
    buffer.writeUInt32LE(44100 * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(size - 44, 40);
    return buffer;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});
