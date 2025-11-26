import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { ContentManager } from '@/lib/ContentManager';
import { Category } from '@/types/content';
import { ValidationError } from '@/lib/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRoute(async () => {
    const body = await request.json();
    const { category } = body as { category: Category };

    if (!category) {
      throw new ValidationError('Category is required', 'category');
    }

    // Update category
    const updatedContent = await ContentManager.updateSourceCategory(
      id,
      category
    );

    return {
      success: true,
      content: updatedContent,
      message: 'Category updated successfully',
    };
  }, 'Failed to update category');
}
