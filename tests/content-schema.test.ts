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

  describe('getCategoryInfo', () => {
    it('returns correct info for all categories', () => {
      expect(ContentSchema.getCategoryInfo('daily-news')).toEqual({
        name: 'Daily News',
        emoji: '📰',
      });
      expect(ContentSchema.getCategoryInfo('ethereum')).toEqual({
        name: 'Ethereum',
        emoji: '⚡',
      });
      expect(ContentSchema.getCategoryInfo('macro')).toEqual({
        name: 'Macro Economics',
        emoji: '📊',
      });
      expect(ContentSchema.getCategoryInfo('startup')).toEqual({
        name: 'Startup',
        emoji: '🚀',
      });
      expect(ContentSchema.getCategoryInfo('ai')).toEqual({
        name: 'AI',
        emoji: '🤖',
      });
      expect(ContentSchema.getCategoryInfo('defi')).toEqual({
        name: 'DeFi',
        emoji: '💎',
      });
    });
  });

  describe('getLanguageInfo', () => {
    it('returns correct info for all languages', () => {
      expect(ContentSchema.getLanguageInfo('zh-TW')).toEqual({
        name: '繁體中文',
        flag: '🇹🇼',
      });
      expect(ContentSchema.getLanguageInfo('en-US')).toEqual({
        name: 'English',
        flag: '🇺🇸',
      });
      expect(ContentSchema.getLanguageInfo('ja-JP')).toEqual({
        name: '日本語',
        flag: '🇯🇵',
      });
    });
  });

  describe('getStatusInfo', () => {
    it('returns correct info for all statuses', () => {
      const draftInfo = ContentSchema.getStatusInfo('draft');
      expect(draftInfo.name).toBe('Draft');
      expect(draftInfo.color).toBe('text-gray-700');
      expect(draftInfo.bgColor).toBe('bg-gray-100');

      const reviewedInfo = ContentSchema.getStatusInfo('reviewed');
      expect(reviewedInfo.name).toBe('Reviewed');

      const socialInfo = ContentSchema.getStatusInfo('social');
      expect(socialInfo.name).toBe('Published');
    });
  });

  describe('constant accessors', () => {
    it('returns supported languages', () => {
      const languages = ContentSchema.getSupportedLanguages();
      expect(languages).toContain('en-US');
      expect(languages).toContain('ja-JP');
      expect(languages).not.toContain('zh-TW');
    });

    it('returns all languages including source', () => {
      const languages = ContentSchema.getAllLanguages();
      expect(languages).toContain('zh-TW');
      expect(languages).toContain('en-US');
      expect(languages).toContain('ja-JP');
    });

    it('returns social platforms', () => {
      const platforms = ContentSchema.getSocialPlatforms();
      expect(platforms).toContain('twitter');
      expect(platforms).toContain('threads');
      expect(platforms).toContain('farcaster');
    });

    it('returns categories', () => {
      const categories = ContentSchema.getCategories();
      expect(categories).toContain('daily-news');
      expect(categories).toContain('ethereum');
      expect(categories.length).toBe(6);
    });

    it('returns statuses', () => {
      const statuses = ContentSchema.getStatuses();
      expect(statuses).toContain('draft');
      expect(statuses).toContain('social');
      expect(statuses.length).toBe(8);
    });

    it('returns example content', () => {
      const example = ContentSchema.getExample();
      expect(example.id).toBe('2025-06-30-example-content');
      expect(example.category).toBe('daily-news');
      expect(example.language).toBe('zh-TW');
    });
  });

  describe('validate edge cases', () => {
    it('rejects invalid framework type', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'daily-news',
        'zh-TW',
        'Title',
        'Content'
      );
      (content as any).framework = 123;
      expect(() => ContentSchema.validate(content)).toThrow(
        'Framework must be a string if provided'
      );
    });

    it('rejects invalid knowledge_concepts_used type', () => {
      const content = ContentSchema.createContent(
        sampleId,
        'daily-news',
        'zh-TW',
        'Title',
        'Content'
      );
      (content as any).knowledge_concepts_used = 'not-an-array';
      expect(() => ContentSchema.validate(content)).toThrow(
        'knowledge_concepts_used must be an array if provided'
      );
    });
  });
});
