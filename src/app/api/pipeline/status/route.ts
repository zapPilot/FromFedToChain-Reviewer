import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get('contentId');

  if (!contentId) {
    return NextResponse.json(
      { success: false, error: 'Missing contentId' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('content_status')
      .select('pipeline_status, error_message, updated_at')
      .eq('id', contentId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contentId,
      status: data.pipeline_status || 'unknown',
      errorMessage: data.error_message,
      lastUpdated: data.updated_at,
    });
  } catch (error) {
    console.error('Failed to get pipeline status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
