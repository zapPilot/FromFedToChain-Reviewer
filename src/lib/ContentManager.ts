import fs from 'fs/promises';
import path from 'path';
import {
  ContentItem,
  ContentReviewFeedback,
  Category,
  Status,
} from '@/types/content';
import { ContentSchema } from './ContentSchema';

export class ContentManager {
  // Point to the FromFedToChain content directory
  // This will be configured via environment variable or symlink
  static CONTENT_DIR =
    process.env.CONTENT_DIR ||
    path.join(process.cwd(), '..', 'FromFedToChain', 'content');

  // Read content from specific language
  static async _readFromLanguage(
    id: string,
    language: string
  ): Promise<ContentItem> {
    const categories = ContentSchema.getCategories();

    for (const category of categories) {
      const filePath = path.join(
        this.CONTENT_DIR,
        language,
        category,
        `${id}.json`
      );
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed: ContentItem = JSON.parse(content);
        return parsed;
      } catch (error) {
        // Continue searching in other categories
        continue;
      }
    }

    throw new Error(`Content not found in ${language}: ${id}`);
  }

  // Read content by ID (searches across all language/category folders)
  static async read(id: string, language?: string): Promise<ContentItem> {
    if (language) {
      return this._readFromLanguage(id, language);
    }

    // Search all languages for the content
    const languages = ContentSchema.getAllLanguages();

    for (const lang of languages) {
      try {
        return await this._readFromLanguage(id, lang);
      } catch (error) {
        // Continue searching in other languages
        continue;
      }
    }

    throw new Error(`Content not found: ${id}`);
  }

  // Read source content specifically (zh-TW)
  static async readSource(id: string): Promise<ContentItem> {
    return this.read(id, 'zh-TW');
  }

  // List all content with optional status filter
  static async list(
    status?: Status | null,
    language?: string | null
  ): Promise<ContentItem[]> {
    const contents: ContentItem[] = [];
    const languages = language ? [language] : ContentSchema.getAllLanguages();
    const categories = ContentSchema.getCategories();

    for (const lang of languages) {
      for (const category of categories) {
        const categoryDir = path.join(this.CONTENT_DIR, lang, category);

        try {
          const files = await fs.readdir(categoryDir);
          const contentFiles = files.filter((f) => f.endsWith('.json'));

          for (const file of contentFiles) {
            try {
              const id = path.basename(file, '.json');
              const content = await this._readFromLanguage(id, lang);

              if (!status || content.status === status) {
                contents.push(content);
              }
            } catch (e) {
              // Skip invalid files
              console.warn(
                `⚠️ Skipping invalid file: ${lang}/${category}/${file}`
              );
            }
          }
        } catch (error) {
          // Category directory doesn't exist - skip
        }
      }
    }

    // Sort by date descending
    return contents.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // Get source content for review (excludes rejected content)
  static async getSourceForReview(): Promise<ContentItem[]> {
    const draftContent = await this.list('draft', 'zh-TW');

    // Filter out content that has been rejected
    return draftContent.filter((content) => {
      const review = content.feedback?.content_review;
      return !review || review.status !== 'rejected';
    });
  }

  // Update content
  static async update(
    id: string,
    updates: Partial<ContentItem>,
    language?: string | null
  ): Promise<ContentItem> {
    const content = await this.read(id, language || undefined);

    const updatedContent: ContentItem = {
      ...content,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Find the correct file path
    const filePath = path.join(
      this.CONTENT_DIR,
      content.language,
      content.category,
      `${id}.json`
    );
    await fs.writeFile(filePath, JSON.stringify(updatedContent, null, 2));

    return updatedContent;
  }

  // Update source content status specifically
  static async updateSourceStatus(
    id: string,
    status: Status
  ): Promise<ContentItem> {
    return this.update(id, { status }, 'zh-TW');
  }

  // Update category for source content
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

    // Update the content object
    const updatedContent: ContentItem = {
      ...content,
      category,
      updated_at: new Date().toISOString(),
    };

    // Write to new location
    const newDir = path.join(this.CONTENT_DIR, 'zh-TW', category);
    await fs.mkdir(newDir, { recursive: true });
    const newFilePath = path.join(newDir, `${id}.json`);
    await fs.writeFile(newFilePath, JSON.stringify(updatedContent, null, 2));

    // Delete old file
    const oldFilePath = path.join(
      this.CONTENT_DIR,
      'zh-TW',
      oldCategory,
      `${id}.json`
    );
    try {
      await fs.unlink(oldFilePath);
    } catch (error) {
      console.warn(`Warning: Could not delete old file: ${oldFilePath}`);
    }

    return updatedContent;
  }

  // Add feedback for content review
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

    // Initialize feedback structure if missing
    if (!contentData.feedback) {
      contentData.feedback = {
        content_review: null,
      };
    }

    // Add or update review feedback
    const feedbackData: ContentReviewFeedback = {
      status,
      score,
      reviewer,
      timestamp: new Date().toISOString(),
      comments: comments || 'Approved for translation',
    };

    contentData.feedback.content_review = feedbackData;
    contentData.updated_at = new Date().toISOString();

    // Write updated content
    const filePath = path.join(
      this.CONTENT_DIR,
      contentData.language,
      contentData.category,
      `${id}.json`
    );
    await fs.writeFile(filePath, JSON.stringify(contentData, null, 2));

    return contentData;
  }

  // Get content by status
  static async getByStatus(status: Status): Promise<ContentItem[]> {
    return this.list(status);
  }

  // Get review history (content with feedback)
  static async getReviewHistory(limit?: number): Promise<ContentItem[]> {
    const allContent = await this.list(null, 'zh-TW');

    // Filter to only content with review feedback
    const reviewed = allContent.filter(
      (content) => content.feedback?.content_review !== null
    );

    // Sort by review timestamp descending
    const sorted = reviewed.sort((a, b) => {
      const aTime = a.feedback?.content_review?.timestamp || '';
      const bTime = b.feedback?.content_review?.timestamp || '';
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return limit ? sorted.slice(0, limit) : sorted;
  }
}
