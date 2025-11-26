import { NextRequest } from 'next/server';
import { handleApiRoute } from '@/lib/api-helpers';
import { TranslationService } from '@/lib/services/TranslationService';
import { ValidationError } from '@/lib/errors';

/**
 * POST /api/pipeline/translate
 * Translate content to target language(s)
 *
 * Body:
 * - contentId: string - Content ID to translate
 * - targetLanguage?: string - Specific language (default: all)
 */
export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const { contentId, targetLanguage } = body;

    if (!contentId) {
      throw new ValidationError(
        'Missing required parameter: contentId',
        'contentId'
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

    return {
      success: true,
      data: result,
      message: `Translation completed for ${contentId}`,
    };
  }, 'Translation failed');
}

/**
 * GET /api/pipeline/translate
 * Get list of content needing translation
 */
export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const content = await TranslationService.getContentNeedingTranslation();

    return {
      success: true,
      data: content,
      count: content.length,
    };
  }, 'Failed to get content needing translation');
}
