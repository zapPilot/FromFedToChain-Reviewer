import { v2 } from '@google-cloud/translate';
import { ContentManager } from '../ContentManager';
import { LANGUAGES, getTranslationConfig } from '@/config/languages';
import { Language } from '@/types/content';

export class TranslationService {
    private static translateClient = new v2.Translate();

    /**
     * Translate content to specified languages or all target languages
     */
    static async translateContent(
        contentId: string,
        targetLanguage?: string
    ): Promise<{ results: Record<string, string>; errors: string[] }> {
        console.log(`Starting translation for content: ${contentId}`);

        // 1. Get source content
        const sourceContent = await ContentManager.readSource(contentId);
        if (!sourceContent) {
            throw new Error(`Source content not found: ${contentId}`);
        }

        // 2. Determine target languages
        let targets: Language[] = [];
        if (targetLanguage) {
            // If specific language requested
            if (
                LANGUAGES.TRANSLATION_TARGETS.includes(targetLanguage as any) ||
                targetLanguage === 'all'
            ) {
                if (targetLanguage === 'all') {
                    targets = LANGUAGES.TRANSLATION_TARGETS;
                } else {
                    targets = [targetLanguage as Language];
                }
            } else {
                throw new Error(`Unsupported target language: ${targetLanguage}`);
            }
        } else {
            // Default to all targets
            targets = LANGUAGES.TRANSLATION_TARGETS;
        }

        // Filter out languages that already exist?
        // For now, we'll overwrite or fail if exists (ContentManager.addTranslation handles insert)
        // Ideally we should check if it exists to avoid error or update instead.
        // But specific requirement was just "add translation".

        const results: Record<string, string> = {};
        const errors: string[] = [];

        // 3. Translate for each target
        for (const lang of targets) {
            try {
                const config = getTranslationConfig(lang);
                const targetCode = config.languageCode;

                console.log(`Translating to ${lang} (${targetCode})...`);

                // Translate Title
                const [titleTranslation] = await this.translateClient.translate(
                    sourceContent.title,
                    targetCode
                );

                // Translate Body
                // Note: Body might be markdown. Google Translate handles HTML/text. 
                // Ideally we should split by paragraphs or use a markdown-aware parser 
                // but for this MVP we'll pass the whole string or assume it's text safe enough.
                // Google Translate API v2 defaults to model 'nmt'.
                const [bodyTranslation] = await this.translateClient.translate(
                    sourceContent.content,
                    targetCode
                );

                // 4. Save translation
                await ContentManager.addTranslation(
                    contentId,
                    lang,
                    titleTranslation,
                    bodyTranslation,
                    sourceContent.framework || '',
                    sourceContent.knowledge_concepts_used
                );

                results[lang] = 'Success';
                console.log(`Saved translation for ${lang}`);
            } catch (error) {
                console.error(`Failed to translate to ${lang}:`, error);
                errors.push(`${lang}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // 5. Update source status if at least one translation succeeded
        if (Object.keys(results).length > 0) {
            await ContentManager.updateSourceStatus(contentId, 'translated');
        }

        return { results, errors };
    }
}
