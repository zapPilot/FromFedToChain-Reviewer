import { describe, it, expect } from 'vitest';
import { ContentSchema } from '@/lib/ContentSchema';

const sampleId = '2025-07-02-test-content';

describe('ContentSchema', () => {
  describe('createContent', () => {
    it('creates a valid content object', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'daily-news',
        'zh-TW',
        'Test Title',
        'Test content body',
        ['Source 1', 'Source 2']
      );

      expect(content.id).toBe(sampleId);
      expect(content.status).toBe('draft');
      expect(content.category).toBe('daily-news');
      expect(content.language).toBe('zh-TW');
      expect(content.title).toBe('Test Title');
      expect(content.content).toBe('Test content body');
      expect(content.references).toEqual(['Source 1', 'Source 2']);
      expect(content.audio_file).toBeNull();
      expect(content.social_hook).toBeNull();
      expect(content.feedback.content_review).toBeNull();
      expect(content.updated_at).toBeDefined();
    });

    it('defaults references to empty array', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'ethereum',
        'en-US',
        'Title',
        'Content'
      );

      expect(content.references).toEqual([]);
    });
  });

  describe('validate', () => {
    it('accepts valid content', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'daily-news',
        'zh-TW',
        'Valid Title',
        'Valid content body'
      );

      expect(ContentSchema.validate(content)).toBe(true);
    });

    it('rejects missing required fields', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'daily-news',
        'zh-TW',
        'Title',
        'Content'
      );
      delete (content as any).title;

      expect(() => ContentSchema.validate(content)).toThrow(
        'Missing required field: title'
      );
    });

    it('rejects invalid categories and statuses', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'daily-news',
        'zh-TW',
        'Title',
        'Content'
      );

      (content as any).category = 'invalid';
      expect(() => ContentSchema.validate(content)).toThrow(
        'Invalid category: invalid'
      );

      (content as any).category = 'daily-news';
      (content as any).status = 'invalid';
      expect(() => ContentSchema.validate(content)).toThrow(
        'Invalid status: invalid'
      );
    });

    it('rejects invalid languages', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'daily-news',
        'zh-TW',
        'Title',
        'Content'
      );

      (content as any).language = 'invalid';
      expect(() => ContentSchema.validate(content)).toThrow(
        'Invalid language: invalid'
      );
    });

    it('rejects empty title or content', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'daily-news',
        'zh-TW',
        '',
        ''
      );

      expect(() => ContentSchema.validate(content)).toThrow(
        'Title and content are required'
      );
    });
  });

  it('provides pipeline metadata', () => {
    const pipeline = ContentSchema.getPipelineConfig();
    expect(Array.isArray(pipeline)).toBe(true);
    expect(pipeline[0].status).toBe('reviewed');
    expect(ContentSchema.getNextStatus('reviewed')).toBe('translated');
    expect(ContentSchema.getPipelinePhases().length).toBeGreaterThan(0);
    expect(ContentSchema.getPipelineStep('wav')?.nextStatus).toBe('m3u8');
  });
});
