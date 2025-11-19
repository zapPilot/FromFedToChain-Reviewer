import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { ContentManager } from '@/lib/ContentManager';
import { ContentSchema } from '@/lib/ContentSchema';
import { TranslationService } from '@/lib/services/TranslationService';
import { TestUtils } from './setup';

let mockTranslateClient: { translate: ReturnType<typeof vi.fn> };

describe('End-to-end workflow', () => {
  let tempDir: string;
  let originalContentDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    originalContentDir = ContentManager.CONTENT_DIR;
    ContentManager.CONTENT_DIR = tempDir;

    mockTranslateClient = {
      translate: vi.fn(),
    };

    vi.spyOn(TranslationService as any, 'getTranslateClient').mockReturnValue(
      mockTranslateClient
    );
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalContentDir;
    await TestUtils.cleanupTempDir(tempDir);
  });

  it('maintains data consistency across translations', async () => {
    const contentId = '2025-07-02-consistency-test';
    const sourceContent = await ContentManager.createSource(
      contentId,
      'ethereum',
      'Ethereum升級測試',
      '這是一個用於測試數據一致性的以太坊內容',
      ['Ethereum Foundation', 'Vitalik Blog'],
      '萬維鋼風格.md'
    );

    await ContentManager.updateSourceStatus(contentId, 'reviewed');

    mockTranslateClient.translate.mockImplementation((text, options) =>
      Promise.resolve([`Translated: ${text} (${options.to})`])
    );

    await TranslationService.translateAll(contentId);

    const allVersions = await ContentManager.getAllLanguagesForId(contentId);
    expect(allVersions).toHaveLength(3);

    allVersions.forEach((version) => {
      expect(version.id).toBe(contentId);
      expect(version.category).toBe('ethereum');
      expect(version.date).toBe(sourceContent.date);
      expect(version.feedback.content_review).toBeNull();
    });

    const updatedSource = await ContentManager.readSource(contentId);
    expect(updatedSource.references).toEqual([
      'Ethereum Foundation',
      'Vitalik Blog',
    ]);
  });

  it('tracks timestamps across status changes', async () => {
    const contentId = '2025-07-02-timestamp-test';
    const beforeCreate = Date.now();
    const sourceContent = await ContentManager.createSource(
      contentId,
      'daily-news',
      'Timestamp Test',
      'Testing timestamp tracking'
    );
    const afterCreate = Date.now();
    const sourceUpdated = new Date(sourceContent.updated_at).getTime();

    expect(sourceUpdated).toBeGreaterThanOrEqual(beforeCreate);
    expect(sourceUpdated).toBeLessThanOrEqual(afterCreate);

    await new Promise((resolve) => setTimeout(resolve, 2));

    const beforeUpdate = Date.now();
    await ContentManager.updateSourceStatus(contentId, 'reviewed');
    const afterUpdate = Date.now();
    const updatedContent = await ContentManager.readSource(contentId);

    const updatedTime = new Date(updatedContent.updated_at).getTime();
    expect(updatedTime).toBeGreaterThan(sourceUpdated);
    expect(updatedTime).toBeGreaterThanOrEqual(beforeUpdate);
    expect(updatedTime).toBeLessThanOrEqual(afterUpdate);
  });

  it('recovers from partial translation failures', async () => {
    const contentId = '2025-07-02-recovery-test';
    await ContentManager.createSource(
      contentId,
      'daily-news',
      'Recovery Test',
      'Testing error recovery'
    );
    await ContentManager.updateSourceStatus(contentId, 'reviewed');

    mockTranslateClient.translate.mockImplementation((text, options) => {
      if (options.to === 'ja') {
        throw new Error('Japanese translation service temporarily unavailable');
      }
      return Promise.resolve([`English: ${text}`]);
    });

    const results = await TranslationService.translateAll(contentId);

    expect(results['en-US'].translatedTitle).toBe('English: Recovery Test');
    expect(results['ja-JP'].error).toContain('Japanese translation service');

    const reviewedSource = await ContentManager.readSource(contentId);
    expect(reviewedSource.status).toBe('reviewed');

    mockTranslateClient.translate.mockImplementation((text, options) =>
      Promise.resolve([`${options.to}: ${text}`])
    );

    const retryResult = await TranslationService.translate(contentId, 'ja-JP');
    expect(retryResult.translatedTitle).toBe('ja: Recovery Test');

    const finalSource = await ContentManager.readSource(contentId);
    expect(finalSource.status).toBe('translated');
  });

  it('validates schema at each workflow step', async () => {
    const contentId = '2025-07-02-validation-test';
    const source = await ContentManager.createSource(
      contentId,
      'daily-news',
      'Validation Test',
      'Testing schema validation'
    );

    expect(() => ContentSchema.validate(source)).not.toThrow();

    await ContentManager.updateSourceStatus(contentId, 'reviewed');
    const reviewed = await ContentManager.readSource(contentId);
    expect(() => ContentSchema.validate(reviewed)).not.toThrow();

    mockTranslateClient.translate.mockResolvedValue(['Translated value']);
    await TranslationService.translate(contentId, 'en-US');
    const translated = await ContentManager.read(contentId, 'en-US');
    expect(() => ContentSchema.validate(translated)).not.toThrow();
  });

  it('handles malformed content gracefully', async () => {
    const malformed = {
      id: '2025-07-02-malformed',
      status: 'draft',
      title: 'Malformed Content',
      content: 'Missing required fields',
    };

    const contentDir = path.join(tempDir, 'zh-TW', 'daily-news');
    await fs.mkdir(contentDir, { recursive: true });
    await fs.writeFile(
      path.join(contentDir, `${malformed.id}.json`),
      JSON.stringify(malformed, null, 2)
    );

    const allContent = await ContentManager.list();
    const found = allContent.find((item) => item.id === malformed.id);
    expect(found).toBeDefined();
    expect(() => ContentSchema.validate(found as any)).toThrow();
  });
});
