import { Translate } from '@google-cloud/translate/build/src/v2/index.js';
import { ContentManager } from '../ContentManager';
import path from 'path';
import {
  getTranslationConfig,
  getTranslationTargets,
} from '@/config/languages';
import type { Language } from '@/types/content';

interface TranslationResult {
  translatedTitle: string;
  translatedContent: string;
}

type TranslationResults = Partial<
  Record<Language, TranslationResult | { error: string }>
>;

/**
 * TranslationService - Handles content translation using Google Cloud Translate API
 */
export class TranslationService {
  static SUPPORTED_LANGUAGES: Language[] = getTranslationTargets();
  private static translate_client: Translate | null = null;
  private static SERVICE_ACCOUNT_PATH =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(process.cwd(), 'service-account.json');

  // Initialize Google Cloud Translate client
  static getTranslateClient(): Translate {
    if (!this.translate_client) {
      this.translate_client = new Translate({
        keyFilename: this.SERVICE_ACCOUNT_PATH,
      });
    }
    return this.translate_client;
  }

  // Translate content to target language
  static async translate(
    id: string,
    targetLanguage: Language
  ): Promise<TranslationResult> {
    if (!this.SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      throw new Error(`Unsupported language: ${targetLanguage}`);
    }

    console.log(`🌐 Translating ${id} to ${targetLanguage}...`);

    // Get the source content (zh-TW)
    const sourceContent = await ContentManager.readSource(id);

    if (sourceContent.status !== 'reviewed') {
      throw new Error(
        `Content must be reviewed before translation. Current status: ${sourceContent.status}`
      );
    }

    const { title, content } = sourceContent;

    // Generate translation using Google Cloud Translate API
    const translatedTitle = await this.translateText(title, targetLanguage);
    const translatedContent = await this.translateText(content, targetLanguage);

    // Prepare knowledge concepts (copy from source, don't translate)
    const knowledgeConcepts = sourceContent.knowledge_concepts_used || [];

    // Add translation to content (creates new language file)
    await ContentManager.addTranslation(
      id,
      targetLanguage,
      translatedTitle,
      translatedContent,
      sourceContent.framework ?? '',
      knowledgeConcepts
    );

    // Update source status if all translations are complete
    const availableLanguages = await ContentManager.getAvailableLanguages(id);
    const targetLanguages: Language[] = ['zh-TW', ...this.SUPPORTED_LANGUAGES];

    if (availableLanguages.length === targetLanguages.length) {
      await ContentManager.updateSourceStatus(id, 'translated');
    }

    console.log(`✅ Translation completed: ${id} (${targetLanguage})`);
    return { translatedTitle, translatedContent };
  }

  // Translate all supported languages for content
  static async translateAll(id: string): Promise<TranslationResults> {
    const results: TranslationResults = {};

    for (const language of this.SUPPORTED_LANGUAGES) {
      try {
        const result = await this.translate(id, language);
        results[language] = result;
      } catch (error) {
        console.error(
          `❌ Translation failed for ${language}: ${error instanceof Error ? error.message : String(error)}`
        );
        results[language] = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }

  // Translate text using Google Cloud Translate API
  static async translateText(
    text: string,
    targetLanguage: Language
  ): Promise<string> {
    const sourceConfig = getTranslationConfig('zh-TW');
    const targetConfig = getTranslationConfig(targetLanguage);

    const sourceLanguage = sourceConfig.languageCode;
    const targetLangCode = targetConfig.languageCode;

    if (!targetConfig.isTarget) {
      throw new Error(
        `Language ${targetLanguage} is not configured as a translation target`
      );
    }

    try {
      const translateClient = this.getTranslateClient();

      const [translation] = await translateClient.translate(text, {
        from: sourceLanguage,
        to: targetLangCode,
        format: 'text',
      });

      return translation;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(
          'Google Cloud service account file not found. Please ensure service-account.json exists in the project root.'
        );
      } else if (error.code === 'EACCES') {
        throw new Error(
          'Google Cloud authentication failed. Please check your service-account.json credentials.'
        );
      } else {
        throw new Error(
          `Translation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // Translate social hook text
  static async translateSocialHook(
    hookText: string,
    targetLanguage: Language
  ): Promise<string> {
    if (!hookText || !hookText.trim()) {
      throw new Error('Hook text cannot be empty');
    }

    if (!this.SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      throw new Error(
        `Unsupported language for social hook translation: ${targetLanguage}`
      );
    }

    console.log(`🔄 Translating social hook to ${targetLanguage}...`);

    try {
      const translatedHook = await this.translateText(
        hookText.trim(),
        targetLanguage
      );
      console.log(`✅ Social hook translated to ${targetLanguage}`);
      return translatedHook;
    } catch (error) {
      console.error(
        `❌ Social hook translation failed for ${targetLanguage}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  // Get content needing translation
  static async getContentNeedingTranslation() {
    return ContentManager.getSourceByStatus('reviewed');
  }
}
