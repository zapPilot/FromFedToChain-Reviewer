import { ContentItem, Category, Language, Status } from '@/types/content';
import { ContentSchema } from '../ContentSchema';
import { getSupabaseAdmin } from '../supabase';
import { getErrorMessage } from '../utils/error-handler';
import { DB_TABLES } from '../constants/db';
import { ContentReadService } from './ContentReadService';

export class ContentWriteService {
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
    framework = '',
    knowledge_concepts_used: string[] = []
  ): Promise<ContentItem> {
    const contentData = ContentSchema.createContent(
      id,
      category,
      language,
      title,
      content,
      references,
      framework,
      knowledge_concepts_used
    );

    ContentSchema.validate(contentData);

    const { data, error } = await getSupabaseAdmin()
      .from(DB_TABLES.CONTENT)
      .insert(contentData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create content: ${getErrorMessage(error)}`);
    }

    return data as ContentItem;
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
    const existing = await ContentReadService.readFromSupabase(
      id,
      language || 'zh-TW' // Default/Fallback logic might need adjustment based on original ContentManager use
    );

    const updatedContent: Partial<ContentItem> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await getSupabaseAdmin()
      .from(DB_TABLES.CONTENT)
      .update(updatedContent)
      .eq('id', id)
      .eq('language', existing.language)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update content: ${getErrorMessage(error)}`);
    }

    return data as ContentItem;
  }
}
