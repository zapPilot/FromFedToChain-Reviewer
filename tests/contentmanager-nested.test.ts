import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ContentManager } from '@/lib/ContentManager';
import { TestUtils } from './setup';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

const fixtureId = '2025-07-01-test-content';

describe('ContentManager nested structure', () => {
  let tempDir: string;
  let originalDir: string;
  let mockSupabase: any;
  let sourceContent: any; // Store reference for mocks

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    originalDir = ContentManager.CONTENT_DIR;
    ContentManager.CONTENT_DIR = tempDir;

    // Create source content first
    sourceContent = TestUtils.createContent({
      id: fixtureId,
      status: 'draft',
      category: 'daily-news',
      language: 'zh-TW',
      title: '測試文章標題',
      content: '這是一篇測試文章的內容...',
      references: ['測試來源1', '測試來源2'],
    });

    // Create a content store that tracks updates
    const contentStore = new Map();
    contentStore.set(`${fixtureId}-zh-TW`, sourceContent);

    // Mock Supabase admin client with stateful content tracking
    let pendingUpdate: any = null;
    let queryFilters: any = {};

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: any) => {
        queryFilters[field] = value;
        return mockSupabase;
      }),
      // Make the builder thenable so it can be awaited directly
      then: vi.fn((resolve: any) => {
        // When awaited without .single() or .order(), execute the query
        const results = Array.from(contentStore.values()).filter(
          (item: any) => {
            for (const [field, value] of Object.entries(queryFilters)) {
              if (item[field] !== value) return false;
            }
            return true;
          }
        );
        queryFilters = {}; // Reset filters
        return resolve({ data: results, error: null });
      }),
      order: vi.fn(() => {
        const results = Array.from(contentStore.values()).filter(
          (item: any) => {
            for (const [field, value] of Object.entries(queryFilters)) {
              if (item[field] !== value) return false;
            }
            return true;
          }
        );
        queryFilters = {}; // Reset filters
        return { data: results, error: null };
      }),
      in: vi.fn(() => ({
        data: Array.from(contentStore.values()),
        error: null,
      })),
      insert: vi.fn((newContent: any) => {
        // Store the content to be inserted
        pendingUpdate = Array.isArray(newContent) ? newContent[0] : newContent;
        return mockSupabase;
      }),
      update: vi.fn((updatedData: any) => {
        // Store update data for when .single() is called
        pendingUpdate = updatedData;
        return mockSupabase;
      }),
      single: vi.fn(() => {
        // Apply pending update if exists
        let content: any = null;

        // If inserting new content
        if (pendingUpdate && !queryFilters.id) {
          content = { ...pendingUpdate };
          const key = `${content.id}-${content.language}`;
          contentStore.set(key, content);
          pendingUpdate = null;
          queryFilters = {};
          return { data: content, error: null };
        }

        // Find matching content by filters
        const results = Array.from(contentStore.values()).filter(
          (item: any) => {
            for (const [field, value] of Object.entries(queryFilters)) {
              if (item[field] !== value) return false;
            }
            return true;
          }
        );

        content = results[0] || null;

        // Apply pending update if exists
        if (pendingUpdate && content) {
          Object.assign(content, pendingUpdate);
          pendingUpdate = null;
        }

        queryFilters = {}; // Reset filters
        return { data: content, error: null };
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase);

    await TestUtils.writeContentFile(tempDir, sourceContent);
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalDir;
    await TestUtils.cleanupTempDir(tempDir);
    vi.clearAllMocks();
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
      const newContent = await ContentManager.createSource(
        '2025-07-01-new-test',
        'ethereum',
        '新測試文章',
        '新的測試內容...',
        ['新來源'],
        '萬維鋼風格.md'
      );

      expect(newContent.id).toBe('2025-07-01-new-test');
      expect(newContent.category).toBe('ethereum');
      expect(newContent.language).toBe('zh-TW');
      expect(newContent.title).toBe('新測試文章');
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
      expect(translation.id).toBe(fixtureId);
      expect(translation.category).toBe('daily-news');
      expect(translation.title).toBe('Test Article Title');
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
        m3u8: 'https://example.com/playlist.m3u8',
      });

      const updated = await ContentManager.readSource(fixtureId);
      expect(updated.audio_file).toBe('/audio/path.wav');
      expect(updated.streaming_urls?.m3u8).toBe(
        'https://example.com/playlist.m3u8'
      );
    });

    it('stores generated social hooks', async () => {
      await ContentManager.addSocialHook(fixtureId, 'zh-TW', 'Hook');
      const updated = await ContentManager.readSource(fixtureId);
      expect(updated.social_hook).toBe('Hook');
    });
  });
});
