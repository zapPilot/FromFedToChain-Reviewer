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
    // Query content table (content_status deprecated in migration 005)
    const { data, error } = await getSupabaseAdmin()
      .from('content')
      .select('id, status, updated_at')
      .eq('id', contentId)
      .eq('language', 'zh-TW')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contentId: data.id,
      status: data.status, // Uses existing status field: draft→reviewed→translated→wav→m3u8→cloudflare→content→social
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
