import { NextRequest, NextResponse } from 'next/server';
import { TranslationService } from '@/lib/services/TranslationService';

/**
 * POST /api/pipeline/translate
 * Translate content to target language(s)
 *
 * Body:
 * - contentId: string - Content ID to translate
 * - targetLanguage?: string - Specific language (default: all)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, targetLanguage } = body;

    if (!contentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: contentId',
        },
        { status: 400 }
      );
    }

    let result;

    if (targetLanguage) {
      // Translate to specific language
      console.log(
        `🌐 Translating content ${contentId} to ${targetLanguage}...`
      );
      result = await TranslationService.translate(contentId, targetLanguage);
    } else {
      // Translate to all supported languages
      console.log(`🌐 Translating content ${contentId} to all languages...`);
      result = await TranslationService.translateAll(contentId);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Translation completed for ${contentId}`,
    });
  } catch (error) {
    console.error('Translation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pipeline/translate
 * Get list of content needing translation
 */
export async function GET(request: NextRequest) {
  try {
    const content = await TranslationService.getContentNeedingTranslation();

    return NextResponse.json({
      success: true,
      data: content,
      count: content.length,
    });
  } catch (error) {
    console.error('Failed to get content needing translation:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get content needing translation',
      },
      { status: 500 }
    );
  }
}
