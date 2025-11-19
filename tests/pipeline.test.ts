import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ContentPipelineService } from '@/lib/services/ContentPipelineService';
import { ContentManager } from '@/lib/ContentManager';
import { TranslationService } from '@/lib/services/TranslationService';
import { AudioService } from '@/lib/services/AudioService';
import { TestUtils } from './setup';

const REVIEWED_ID = '2025-07-01-reviewed';
const TRANSLATED_ID = '2025-07-01-translated';

describe('ContentPipelineService', () => {
  let tempDir: string;
  let originalDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    originalDir = ContentManager.CONTENT_DIR;
    ContentManager.CONTENT_DIR = tempDir;

    // reviewed content
    const reviewed = TestUtils.createContent({
      id: REVIEWED_ID,
      status: 'reviewed',
    });

    // translated content
    const translated = TestUtils.createContent({
      id: TRANSLATED_ID,
      status: 'translated',
    });

    await TestUtils.seedContentSet(tempDir, [reviewed, translated]);
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalDir;
    await TestUtils.cleanupTempDir(tempDir);
  });

  it('returns pending content for reviewed status', async () => {
    const pending = await ContentPipelineService.getPendingContent('reviewed');
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(REVIEWED_ID);
  });

  it('aggregates pending content across pipeline', async () => {
    const pending = await ContentPipelineService.getAllPendingContent();
    const ids = pending.map((item) => item.content.id);
    expect(ids).toEqual(expect.arrayContaining([REVIEWED_ID, TRANSLATED_ID]));
  });

  it('processes translation step and updates status', async () => {
    const translateSpy = vi
      .spyOn(TranslationService, 'translateAll')
      .mockResolvedValue({});

    const result =
      await ContentPipelineService.processContentNextStep(REVIEWED_ID);

    expect(result).toBe(true);
    expect(translateSpy).toHaveBeenCalledWith(REVIEWED_ID);

    const updated = await ContentManager.readSource(REVIEWED_ID);
    expect(updated.status).toBe('translated');
  });

  it('processes audio generation for translated content', async () => {
    const audioSpy = vi
      .spyOn(AudioService, 'generateWavOnly')
      .mockResolvedValue({});

    const result =
      await ContentPipelineService.processContentNextStep(TRANSLATED_ID);

    expect(result).toBe(true);
    expect(audioSpy).toHaveBeenCalledWith(TRANSLATED_ID);

    const updated = await ContentManager.readSource(TRANSLATED_ID);
    expect(updated.status).toBe('wav');
  });
});
