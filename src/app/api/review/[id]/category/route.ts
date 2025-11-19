import { NextRequest, NextResponse } from 'next/server';
import { ContentManager } from '@/lib/ContentManager';
import { Category } from '@/types/content';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { category } = body as { category: Category };

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Update category
    const updatedContent = await ContentManager.updateSourceCategory(
      id,
      category
    );

    return NextResponse.json({
      success: true,
      content: updatedContent,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      {
        error: 'Failed to update category',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
