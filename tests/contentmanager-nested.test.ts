import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { ContentManager } from '@/lib/ContentManager';
import { TestUtils } from './setup';

const fixtureId = '2025-07-01-test-content';

describe('ContentManager nested structure', () => {
  let tempDir: string;
  let originalDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    originalDir = ContentManager.CONTENT_DIR;
    ContentManager.CONTENT_DIR = tempDir;

    const sourceContent = TestUtils.createContent({
      id: fixtureId,
      status: 'draft',
      category: 'daily-news',
      language: 'zh-TW',
      title: '測試文章標題',
      content: '這是一篇測試文章的內容...',
      references: ['測試來源1', '測試來源2'],
    });

    await TestUtils.writeContentFile(tempDir, sourceContent);
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalDir;
    await TestUtils.cleanupTempDir(tempDir);
  });

  describe('Folder structure validation', () => {
    it('lists content in nested directories', async () => {
      const contents = await ContentManager.list();
      expect(contents).toHaveLength(1);
      expect(contents[0].id).toBe(fixtureId);
      expect(contents[0].language).toBe('zh-TW');
    });

    it('reads content by ID across nested structure', async () => {
      const content = await ContentManager.read(fixtureId);
      expect(content.title).toBe('測試文章標題');
      expect(content.language).toBe('zh-TW');
    });

    it('throws when content missing', async () => {
      await expect(ContentManager.read('missing-id')).rejects.toThrow(
        'Content not found'
      );
    });
  });

  describe('Source operations', () => {
    it('filters source content by status', async () => {
      const drafts = await ContentManager.getSourceByStatus('draft');
      expect(drafts).toHaveLength(1);
      expect(drafts[0].status).toBe('draft');
    });

    it('creates source content inside zh-TW tree', async () => {
      await ContentManager.createSource(
        '2025-07-01-new-test',
        'ethereum',
        '新測試文章',
        '新的測試內容...',
        ['新來源'],
        '萬維鋼風格.md'
      );

      const filePath = path.join(
        tempDir,
        'zh-TW',
        'ethereum',
        '2025-07-01-new-test.json'
      );
      await expect(fs.access(filePath)).resolves.toBeUndefined();
    });

    it('updates source status', async () => {
      await ContentManager.updateSourceStatus(fixtureId, 'reviewed');
      const updated = await ContentManager.readSource(fixtureId);
      expect(updated.status).toBe('reviewed');
    });
  });

  describe('Translation operations', () => {
    it('writes translations under target language folders', async () => {
      const translation = await ContentManager.addTranslation(
        fixtureId,
        'en-US',
        'Test Article Title',
        'This is test article content...',
        '萬維鋼風格.md'
      );

      expect(translation.language).toBe('en-US');
      expect(translation.status).toBe('translated');

      const filePath = path.join(
        tempDir,
        'en-US',
        'daily-news',
        `${fixtureId}.json`
      );
      await expect(fs.access(filePath)).resolves.toBeUndefined();
    });

    it('returns available languages for an id', async () => {
      await ContentManager.addTranslation(
        fixtureId,
        'en-US',
        'Test Title',
        'Test content...',
        '萬維鋼風格.md'
      );

      const languages = await ContentManager.getAvailableLanguages(fixtureId);
      expect(languages).toEqual(expect.arrayContaining(['zh-TW', 'en-US']));
    });

    it('returns all language versions for an id', async () => {
      await ContentManager.addTranslation(
        fixtureId,
        'en-US',
        'Test Title',
        'Test content...',
        '萬維鋼風格.md'
      );

      const versions = await ContentManager.getAllLanguagesForId(fixtureId);
      expect(versions.map((v) => v.language)).toEqual(
        expect.arrayContaining(['zh-TW', 'en-US'])
      );
    });
  });

  describe('Audio/social helpers', () => {
    it('persists audio metadata on update', async () => {
      await ContentManager.addAudio(fixtureId, 'zh-TW', '/audio/path.wav', {
        m3u8: 'https://example.com/audio.m3u8',
      });

      const updated = await ContentManager.readSource(fixtureId);
      expect(updated.audio_file).toBe('/audio/path.wav');
      expect(updated.streaming_urls?.m3u8).toBe(
        'https://example.com/audio.m3u8'
      );
    });

    it('stores generated social hooks', async () => {
      await ContentManager.addSocialHook(fixtureId, 'zh-TW', 'Hook');
      const updated = await ContentManager.readSource(fixtureId);
      expect(updated.social_hook).toBe('Hook');
    });
  });
});
