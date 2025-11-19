import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { ContentManager } from '@/lib/ContentManager';
import { TranslationService } from '@/lib/services/TranslationService';
import { TestUtils } from './setup';

const CONTENT_ID = '2025-07-01-translation-test';

describe('TranslationService', () => {
  let tempDir: string;
  let originalContentDir: string;
  let mockClient: { translate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    originalContentDir = ContentManager.CONTENT_DIR;
    ContentManager.CONTENT_DIR = tempDir;

    const reviewedContent = TestUtils.createContent({
      id: CONTENT_ID,
      status: 'reviewed',
      language: 'zh-TW',
    });
    await TestUtils.writeContentFile(tempDir, reviewedContent);

    mockClient = {
      translate: vi.fn(),
    };

    vi.spyOn(TranslationService as any, 'getTranslateClient').mockReturnValue(
      mockClient
    );
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalContentDir;
    await TestUtils.cleanupTempDir(tempDir);
  });

  it('translates Chinese text to English', async () => {
    const mockTranslation = 'Bitcoin price breaks new high';
    mockClient.translate.mockResolvedValue([mockTranslation]);

    const result = await TranslationService.translateText(
      '比特幣價格突破新高',
      'en-US'
    );

    expect(result).toBe(mockTranslation);
    expect(mockClient.translate).toHaveBeenCalledWith('比特幣價格突破新高', {
      from: 'zh',
      to: 'en',
      format: 'text',
    });
  });

  it('translates reviewed content and writes translation file', async () => {
    mockClient.translate
      .mockResolvedValueOnce(['Translated Title'])
      .mockResolvedValueOnce(['Translated Content']);

    const result = await TranslationService.translate(CONTENT_ID, 'en-US');

    expect(result.translatedTitle).toBe('Translated Title');
    expect(mockClient.translate).toHaveBeenCalledTimes(2);

    const translationPath = path.join(
      tempDir,
      'en-US',
      'daily-news',
      `${CONTENT_ID}.json`
    );
    const translationRaw = await fs.readFile(translationPath, 'utf-8');
    const translation = JSON.parse(translationRaw);

    expect(translation.language).toBe('en-US');
    expect(translation.status).toBe('translated');

    const source = await ContentManager.readSource(CONTENT_ID);
    expect(source.status).toBe('reviewed');
  });

  it('translates to all languages and updates status to translated', async () => {
    const responses = ['EN title', 'EN body', 'JA title', 'JA body'];
    mockClient.translate.mockImplementation(() =>
      Promise.resolve([responses.shift()])
    );

    const result = await TranslationService.translateAll(CONTENT_ID);

    expect(Object.keys(result)).toEqual(['en-US', 'ja-JP']);

    const source = await ContentManager.readSource(CONTENT_ID);
    expect(source.status).toBe('translated');

    const englishPath = path.join(
      tempDir,
      'en-US',
      'daily-news',
      `${CONTENT_ID}.json`
    );
    const japanesePath = path.join(
      tempDir,
      'ja-JP',
      'daily-news',
      `${CONTENT_ID}.json`
    );

    await expect(fs.access(englishPath)).resolves.toBeUndefined();
    await expect(fs.access(japanesePath)).resolves.toBeUndefined();
  });

  it('throws when translating unsupported language', async () => {
    await expect(
      TranslationService.translateText('text', 'es-ES')
    ).rejects.toThrow('Unsupported language: es-ES');
  });

  it('rejects translation when source not reviewed', async () => {
    const draft = TestUtils.createContent({
      id: 'draft-id',
      status: 'draft',
    });
    await TestUtils.writeContentFile(tempDir, draft);

    await expect(
      TranslationService.translate('draft-id', 'en-US')
    ).rejects.toThrow('Content must be reviewed before translation');
  });
});
