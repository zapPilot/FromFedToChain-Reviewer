import {
  ContentItem,
  ContentReviewFeedback,
  Category,
  Status,
  Language,
  StreamingUrls,
} from '@/types/content';
import { ContentSchema } from './ContentSchema';
import { getSupabaseAdmin } from './supabase';

/**
 * ContentManager - Manages content operations using Supabase as primary storage
 *
 * Migrated from filesystem-based storage to Supabase database.
 * All content is stored in review_web.content table with composite key (id, language).
 */
export class ContentManager {
  // Legacy: Content directory path (optional, for local development)
  static CONTENT_DIR =
    process.env.CONTENT_DIR || process.cwd() + '/../FromFedToChain/content';

  /**
   * Read content by ID and language from Supabase
   */
  private static async _readFromSupabase(
    id: string,
    language: string
  ): Promise<ContentItem> {
    const { data, error } = await getSupabaseAdmin()
      .from('content')
      .select('*')
      .eq('id', id)
      .eq('language', language)
      .single();

    if (error || !data) {
      throw new Error(`Content not found in ${language}: ${id}`);
    }

    return data as ContentItem;
  }

  /**
   * Read content by ID (searches across all languages if not specified)
   */
  static async read(id: string, language?: string): Promise<ContentItem> {
    if (language) {
      return this._readFromSupabase(id, language);
    }

    // Search all languages for the content
    const languages = ContentSchema.getAllLanguages();

    for (const lang of languages) {
      try {
        return await this._readFromSupabase(id, lang);
      } catch (error) {
        // Continue searching in other languages
        continue;
      }
    }

    throw new Error(`Content not found: ${id}`);
  }

  /**
   * Create new content in Supabase
   */
  static async create(
    id: string,
    category: Category,
    language: Language,
    title: string,
    content: string,
    references: string[] = [],
    framework = ''
  ): Promise<ContentItem> {
    const contentData = ContentSchema.createContent(
      id,
      category,
      language,
      title,
      content,
      references,
      framework
    );

    ContentSchema.validate(contentData);

    const { data, error } = await getSupabaseAdmin()
      .from('content')
      .insert(contentData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create content: ${error.message}`);
    }

    return data as ContentItem;
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
    framework = ''
  ) {
    return this.create(
      id,
      category,
      'zh-TW',
      title,
      content,
      references,
      framework
    );
  }

  /**
   * List all content with optional status and language filters
   */
  static async list(
    status?: Status | null,
    language?: string | null
  ): Promise<ContentItem[]> {
    let query = getSupabaseAdmin().from('content').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (language) {
      query = query.eq('language', language);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to list content: ${error.message}`);
    }

    return (data || []) as ContentItem[];
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
    const draftContent = await this.list('draft', 'zh-TW');

    // Filter out content that has been reviewed (accepted or rejected)
    return draftContent.filter((content) => {
      const review = content.feedback?.content_review;

      // If no review exists, it needs review
      if (!review) return true;

      // If review status is pending, it needs review
      if (review.status === 'pending') return true;

      // If accepted or rejected, it does NOT need review
      if (review.status === 'accepted' || review.status === 'rejected')
        return false;

      return true;
    });
  }

  /**
   * Update content in Supabase
   */
  static async update(
    id: string,
    updates: Partial<ContentItem>,
    language?: string | null
  ): Promise<ContentItem> {
    // Read existing content to get language if not specified
    const existing = await this.read(id, language || undefined);

    const updatedContent: Partial<ContentItem> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await getSupabaseAdmin()
      .from('content')
      .update(updatedContent)
      .eq('id', id)
      .eq('language', existing.language)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update content: ${error.message}`);
    }

    return data as ContentItem;
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
    // Read the content first
    const content = await this.readSource(id);
    const oldCategory = content.category;

    // If category hasn't changed, just return
    if (oldCategory === category) {
      return content;
    }

    // Update the category in Supabase
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
    // Validate that rejection requires feedback
    if (status === 'rejected' && (!comments || comments.trim() === '')) {
      throw new Error('Feedback comment is required when rejecting content');
    }

    const contentData = await this.read(id, 'zh-TW');

    // Build review feedback
    const feedbackData: ContentReviewFeedback = {
      status,
      score,
      reviewer,
      timestamp: new Date().toISOString(),
      comments: comments || 'Approved for translation',
    };

    // Update feedback in content
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

    const translation = ContentSchema.createContent(
      id,
      sourceContent.category,
      targetLanguage,
      title,
      body,
      sourceContent.references,
      framework
    );

    translation.status = 'translated';
    if (knowledgeConcepts.length) {
      translation.knowledge_concepts_used = knowledgeConcepts;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('content')
      .insert(translation)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add translation: ${error.message}`);
    }

    return data as ContentItem;
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
    const { data, error } = await getSupabaseAdmin()
      .from('content')
      .select('*')
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to get languages for content: ${error.message}`);
    }

    return (data || []) as ContentItem[];
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
    let query = getSupabaseAdmin()
      .from('content')
      .select('*')
      .eq('language', 'zh-TW')
      .not('feedback->content_review', 'is', null)
      .order('feedback->content_review->timestamp', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get review history: ${error.message}`);
    }

    return (data || []) as ContentItem[];
  }

  /**
   * Get content items pending pipeline processing
   * Criteria:
   * 1. Status is 'reviewed' (content accepted during review)
   * 2. Status is 'approved' or 'in_progress' (legacy statuses)
   * 3. OR Status is 'draft' with feedback.content_review.status === 'accepted'
   */
  static async getPendingPipelineItems(): Promise<ContentItem[]> {
    const { data: rawContent, error } = await getSupabaseAdmin()
      .from('content')
      .select('*')
      .in('status', ['reviewed', 'approved', 'in_progress', 'draft'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending content: ${error.message}`);
    }

    return (
      rawContent?.filter((item: any) => {
        if (
          item.status === 'reviewed' ||
          item.status === 'approved' ||
          item.status === 'in_progress'
        ) {
          return true;
        }
        if (item.status === 'draft') {
          return item.feedback?.content_review?.status === 'accepted';
        }
        return false;
      }) || []
    );
  }
}
