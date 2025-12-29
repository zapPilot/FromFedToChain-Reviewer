import { ContentItem, Status } from '@/types/content';
import { getSupabaseAdmin } from '../supabase';
import { getErrorMessage } from '../utils/error-handler';
import { DB_TABLES } from '../constants/db';

export class ContentReadService {
  /**
   * Read content by ID and language from Supabase
   */
  static async readFromSupabase(
    id: string,
    language: string
  ): Promise<ContentItem> {
    const { data, error } = await getSupabaseAdmin()
      .from(DB_TABLES.CONTENT)
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
   * List all content with optional status and language filters
   */
  static async list(
    status?: Status | null,
    language?: string | null
  ): Promise<ContentItem[]> {
    let query = getSupabaseAdmin().from(DB_TABLES.CONTENT).select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (language) {
      query = query.eq('language', language);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to list content: ${getErrorMessage(error)}`);
    }

    return (data || []) as ContentItem[];
  }

  /**
   * Get review history (content with feedback)
   */
  static async getReviewHistory(limit?: number): Promise<ContentItem[]> {
    let query = getSupabaseAdmin()
      .from(DB_TABLES.CONTENT)
      .select('*')
      .eq('language', 'zh-TW')
      .not('feedback->content_review', 'is', null)
      .order('feedback->content_review->timestamp', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Failed to get review history: ${getErrorMessage(error)}`
      );
    }

    return (data || []) as ContentItem[];
  }

  /**
   * Get content items pending pipeline processing
   */
  static async getPendingPipelineItems(): Promise<ContentItem[]> {
    const { data: rawContent, error } = await getSupabaseAdmin()
      .from(DB_TABLES.CONTENT)
      .select('*')
      .in('status', ['reviewed', 'approved', 'in_progress', 'draft'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch pending content: ${getErrorMessage(error)}`
      );
    }

    return (rawContent || []) as ContentItem[];
  }
}
