import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { ContentManager } from '@/lib/ContentManager';
import { ReviewSubmitRequest, ReviewSubmitResponse } from '@/types/content';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ValidationError, NotFoundError, ApiError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRoute(async () => {
    const body: ReviewSubmitRequest = await request.json();
    const { action, feedback, newCategory } = body;

    // Validate required feedback for rejection
    if (action === 'reject' && (!feedback || !feedback.trim())) {
      throw new ValidationError(
        'Feedback is required when rejecting content',
        'feedback'
      );
    }

    // Read content from Git to get metadata
    let content;
    try {
      content = await ContentManager.readSource(id);
    } catch (error) {
      throw new NotFoundError('Content', id);
    }

    // Prepare status record for Supabase
    const score = action === 'accept' ? 4 : 2;
    const reviewer = 'reviewer_web'; // Default reviewer name for web interface
    const reviewStatus = action === 'accept' ? 'accepted' : 'rejected';
    const contentStatus = action === 'accept' ? 'reviewed' : 'draft';

    // Use newCategory if provided, otherwise keep current category
    const finalCategory = newCategory || content.category;

    // Upsert status record in Supabase
    const { error } = await getSupabaseAdmin()
      .from('content_status')
      .upsert(
        {
          id: content.id,
          category: finalCategory,
          language: content.language,
          title: content.title,
          status: contentStatus,
          reviewer,
          review_status: reviewStatus,
          review_score: score,
          review_feedback: feedback || 'Approved for translation',
          review_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

    if (error) {
      console.error('Supabase error:', error);
      throw new ApiError('Failed to save review status', 500);
    }

    // Return the content (unchanged from Git)
    const response: ReviewSubmitResponse = {
      success: true,
      content,
      message: `Content ${action}ed successfully`,
    };

    return response;
  }, 'Failed to submit review');
}
