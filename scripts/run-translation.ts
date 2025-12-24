import { TranslationService } from '@/lib/services/TranslationService';

async function main() {
  const contentId = process.env.CONTENT_ID;
  const targetLanguage = process.env.TARGET_LANGUAGE;

  if (!contentId) {
    console.error('Error: CONTENT_ID environment variable is required.');
    process.exit(1);
  }

  console.log(`Starting translation job for content ID: ${contentId}`);
  if (targetLanguage) {
    console.log(`Target language: ${targetLanguage}`);
  } else {
    console.log('Target language: ALL');
  }

  try {
    const { results, errors } = await TranslationService.translateContent(
      contentId,
      targetLanguage
    );

    console.log('Translation results:', JSON.stringify(results, null, 2));

    if (errors.length > 0) {
      console.error('Translation errors:', errors);
      // We might want to exit with failure if ALL failed, or just warn if some failed.
      // For now, if we have results, consider it a partial success.
      if (Object.keys(results).length === 0) {
        process.exit(1);
      }
    }

    console.log('Translation job completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during translation:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
