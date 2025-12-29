import {
  ContentItem,
  ContentReviewFeedback,
  Category,
  Status,
  Language,
  StreamingUrls,
} from '@/types/content';
import { ContentSchema } from './ContentSchema';
import { ContentReadService } from './services/ContentReadService';
import { ContentWriteService } from './services/ContentWriteService';
import { ContentReviewService } from './services/ContentReviewService';

/**
 * ContentManager - Manages content operations (Facade)
 * Delegates to specialized services.
 */
export class ContentManager {
  /**
   * Read content by ID (searches across all languages if not specified)
   */
  static async read(id: string, language?: string): Promise<ContentItem> {
    if (language) {
      return ContentReadService.readFromSupabase(id, language);
    }

    // Search all languages for the content
    const languages = ContentSchema.getAllLanguages();

    for (const lang of languages) {
      try {
        return await ContentReadService.readFromSupabase(id, lang);
      } catch (error) {
        // Continue searching in other languages
        continue;
      }
    }

    throw new Error(`Content not found: ${id}`);
  }

  /**
   * Create new content
   */
  static async create(
    id: string,
    category: Category,
    language: Language,
    title: string,
    content: string,
    references: string[] = [],
    framework = '',
    knowledge_concepts_used: string[] = []
  ): Promise<ContentItem> {
    return ContentWriteService.create(
      id,
      category,
      language,
      title,
      content,
      references,
      framework,
      knowledge_concepts_used
    );
  }

  /**
   * Read source content specifically (zh-TW)
   */
  static async readSource(id: string): Promise<ContentItem> {
    return this.read(id, 'zh-TW');
  }

  /**
   * Create source content (zh-TW)
   */
  static async createSource(
    id: string,
    category: Category,
    title: string,
    content: string,
    references: string[] = [],
    framework = '',
    knowledge_concepts_used: string[] = []
  ) {
    return this.create(
      id,
      category,
      'zh-TW',
      title,
      content,
      references,
      framework,
      knowledge_concepts_used
    );
  }

  /**
   * List all content with optional status and language filters
   */
  static async list(
    status?: Status | null,
    language?: string | null
  ): Promise<ContentItem[]> {
    return ContentReadService.list(status, language);
  }

  /**
   * Get source content by status
   */
  static async getSourceByStatus(status: Status) {
    return this.list(status, 'zh-TW');
  }

  /**
   * Get source content for review (excludes rejected content)
   */
  static async getSourceForReview(): Promise<ContentItem[]> {
    return ContentReviewService.getSourceForReview();
  }

  /**
   * Update content
   */
  static async update(
    id: string,
    updates: Partial<ContentItem>,
    language?: string | null
  ): Promise<ContentItem> {
    return ContentWriteService.update(id, updates, language);
  }

  /**
   * Update source content status
   */
  static async updateSourceStatus(
    id: string,
    status: Status
  ): Promise<ContentItem> {
    return this.update(id, { status }, 'zh-TW');
  }

  /**
   * Update content status
   */
  static async updateStatus(id: string, status: Status) {
    return this.update(id, { status });
  }

  /**
   * Update category for source content
   */
  static async updateSourceCategory(
    id: string,
    category: Category
  ): Promise<ContentItem> {
    const content = await this.readSource(id);
    if (content.category === category) {
      return content;
    }
    return this.update(id, { category }, 'zh-TW');
  }

  /**
   * Add feedback for content review
   */
  static async addContentFeedback(
    id: string,
    status: 'accepted' | 'rejected',
    score: number,
    reviewer: string,
    comments: string
  ): Promise<ContentItem> {
    if (status === 'rejected' && (!comments || comments.trim() === '')) {
      throw new Error('Feedback comment is required when rejecting content');
    }

    const contentData = await this.read(id, 'zh-TW');

    const feedbackData: ContentReviewFeedback = {
      status,
      score,
      reviewer,
      timestamp: new Date().toISOString(),
      comments: comments || 'Approved for translation',
    };

    const updatedFeedback = {
      ...contentData.feedback,
      content_review: feedbackData,
    };

    return this.update(id, { feedback: updatedFeedback }, 'zh-TW');
  }

  /**
   * Get content by status
   */
  static async getByStatus(status: Status): Promise<ContentItem[]> {
    return this.list(status);
  }

  /**
   * Add translation for content
   */
  static async addTranslation(
    id: string,
    targetLanguage: Language,
    title: string,
    body: string,
    framework: string,
    knowledgeConcepts: string[] = []
  ) {
    const sourceContent = await this.read(id, 'zh-TW');

    // Use ContentWriteService.create directly by passing args
    return ContentWriteService.create(
      id,
      sourceContent.category,
      targetLanguage,
      title,
      body,
      sourceContent.references,
      framework,
      knowledgeConcepts
    ).then(async (newContent) => {
      // The status override to 'translated' needs to happen.
      // ContentWriteService.create creates as 'draft'.
      // So we need to update it immediately.
      return ContentWriteService.update(
        id,
        { status: 'translated' },
        targetLanguage
      );
    });
  }

  /**
   * Add audio file reference to content
   */
  static async addAudio(
    id: string,
    language: Language,
    audioPath: string,
    streamingUrls: Partial<StreamingUrls> = {}
  ) {
    const updates: Partial<ContentItem> = { audio_file: audioPath };
    if (Object.keys(streamingUrls).length) {
      updates.streaming_urls = streamingUrls;
    }
    return this.update(id, updates, language);
  }

  /**
   * Add social hook to content
   */
  static async addSocialHook(id: string, language: string, hook: string) {
    return this.update(id, { social_hook: hook }, language);
  }

  /**
   * Get all language versions for a content ID
   */
  static async getAllLanguagesForId(id: string) {
    const languages = ContentSchema.getAllLanguages();
    const results: ContentItem[] = [];

    for (const lang of languages) {
      try {
        // Use ContentReadService directly
        const item = await ContentReadService.readFromSupabase(id, lang);
        results.push(item);
      } catch (e) {
        // ignore
      }
    }
    return results;
  }

  /**
   * Get available languages for a content ID
   */
  static async getAvailableLanguages(id: string): Promise<string[]> {
    const allVersions = await this.getAllLanguagesForId(id);
    return allVersions.map((content) => content.language);
  }

  /**
   * Get review history (content with feedback)
   */
  static async getReviewHistory(limit?: number): Promise<ContentItem[]> {
    return ContentReadService.getReviewHistory(limit);
  }

  /**
   * Get content items pending pipeline processing
   */
  static async getPendingPipelineItems(): Promise<ContentItem[]> {
    const rawContent = await ContentReadService.getPendingPipelineItems();
    return ContentReviewService.filterPendingPipelineItems(rawContent);
  }
}
