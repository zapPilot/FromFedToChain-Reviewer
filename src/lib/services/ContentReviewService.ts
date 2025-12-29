import { ContentItem } from '@/types/content';
import { ContentReadService } from './ContentReadService';

export class ContentReviewService {
  /**
   * Get source content for review (excludes rejected content)
   */
  static async getSourceForReview(): Promise<ContentItem[]> {
    const draftContent = await ContentReadService.list('draft', 'zh-TW');

    return draftContent.filter((content) => {
      const review = content.feedback?.content_review;
      if (!review) return true;
      if (review.status === 'pending') return true;
      if (review.status === 'accepted' || review.status === 'rejected')
        return false;
      return true;
    });
  }

  /**
   * Filter pending pipeline items from raw content list
   */
  static filterPendingPipelineItems(items: ContentItem[]): ContentItem[] {
    return items.filter((item) => this._isPendingPipelineItem(item));
  }

  private static _isPendingPipelineItem(item: any): boolean {
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
  }
}
