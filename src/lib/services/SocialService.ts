import { execSync } from 'child_process';
import { ContentManager } from '../ContentManager';
import { ContentSchema } from '../ContentSchema';
import { TranslationService } from './TranslationService';
import {
  getSocialConfig,
  getTranslationTargets,
  shouldGenerateSocialHooks,
} from '@/config/languages';
import { getErrorMessage, logError } from '../utils/error-handler';

// Command executor type
type CommandExecutor = (command: string, options?: any) => Buffer | string;

// Default command executor
const executeCommandSync: CommandExecutor = (command, options) => {
  return execSync(command, options);
};

interface SocialHookResult {
  success: boolean;
  hook?: string;
  error?: string;
  method?: string;
}

export class SocialService {
  // Dynamic language support based on configuration
  static get SUPPORTED_LANGUAGES(): string[] {
    return ContentSchema.getAllLanguages().filter((lang) =>
      shouldGenerateSocialHooks(lang)
    );
  }

  // Generate social hook for specific language
  static async generateHook(
    id: string,
    language: string,
    commandExecutor: CommandExecutor = executeCommandSync
  ): Promise<string> {
    console.log(`📱 Generating social hook: ${id} (${language})`);

    // Get specific language content
    const content = await ContentManager.read(id, language);

    if (!content) {
      throw new Error(`No ${language} translation found for ${id}`);
    }

    const { title, content: text } = content;

    // Generate social hook using Claude
    const hook = await this.generateHookWithClaude(
      title,
      text,
      language,
      commandExecutor,
      id
    );

    // Validate hook length
    const validatedHook = this.validateHookLength(hook, language);

    // Add social hook to content
    await ContentManager.addSocialHook(id, language, validatedHook);

    console.log(`✅ Social hook generated: ${id} (${language})`);
    return validatedHook;
  }

  // Generate social hooks using zh-TW-first translation pipeline
  static async generateAllHooksTranslated(
    id: string,
    commandExecutor: CommandExecutor = executeCommandSync
  ): Promise<Record<string, SocialHookResult>> {
    console.log(`📱 Starting zh-TW-first social hook generation for: ${id}`);

    // Check source status first
    const sourceContent = await ContentManager.readSource(id);

    if (sourceContent.status !== 'content') {
      throw new Error(
        `Content must be uploaded before social hooks. Current status: ${sourceContent.status}`
      );
    }

    // Get all available languages for this content
    const availableLanguages = await ContentManager.getAvailableLanguages(id);

    // Get all languages that should have social hooks generated
    const socialHookLanguages = ContentSchema.getAllLanguages().filter(
      (lang) =>
        availableLanguages.includes(lang) && shouldGenerateSocialHooks(lang)
    );

    if (socialHookLanguages.length === 0) {
      console.log(
        `⚠️  No languages configured for social hook generation for ${id}`
      );
      await ContentManager.updateSourceStatus(id, 'social');
      return {};
    }

    const results: Record<string, SocialHookResult> = {};

    try {
      // Step 1: Get or generate master Chinese (zh-TW) hook - the source language
      const sourceLang = 'zh-TW';
      if (socialHookLanguages.includes(sourceLang)) {
        const sourceContent = await ContentManager.read(id, sourceLang);
        if (!sourceContent) {
          throw new Error(`No Chinese source content found for ${id}`);
        }

        let validatedChineseHook: string;

        // Check if Chinese hook already exists
        if (sourceContent.social_hook && sourceContent.social_hook.trim()) {
          console.log(`🎯 Using existing Chinese social hook for: ${id}`);
          validatedChineseHook = sourceContent.social_hook;
          results[sourceLang] = {
            success: true,
            hook: validatedChineseHook,
            method: 'existing',
          };
          console.log(`✅ Master Chinese hook found: ${id}`);
        } else {
          // Generate new Chinese hook
          console.log(`🎯 Generating master Chinese social hook for: ${id}`);

          const masterHook = await this.generateHookWithClaude(
            sourceContent.title,
            sourceContent.content,
            sourceLang,
            commandExecutor,
            id
          );

          // Validate and save Chinese hook
          validatedChineseHook = this.validateHookLength(
            masterHook,
            sourceLang
          );
          await ContentManager.addSocialHook(
            id,
            sourceLang,
            validatedChineseHook
          );

          results[sourceLang] = {
            success: true,
            hook: validatedChineseHook,
            method: 'generated',
          };
          console.log(`✅ Master Chinese hook generated: ${id}`);
        }

        // Step 2: Translate Chinese hook to other languages
        const otherLanguages = socialHookLanguages.filter(
          (lang) => lang !== sourceLang
        );
        const translationTargets = getTranslationTargets();

        for (const targetLang of otherLanguages) {
          try {
            if (translationTargets.includes(targetLang)) {
              // Translate from Chinese to target language
              console.log(
                `🔄 Translating Chinese social hook to ${targetLang}: ${id}`
              );

              const translatedHook =
                await TranslationService.translateSocialHook(
                  validatedChineseHook,
                  targetLang
                );
              const validatedHook = this.validateHookLength(
                translatedHook,
                targetLang
              );

              await ContentManager.addSocialHook(id, targetLang, validatedHook);
              results[targetLang] = {
                success: true,
                hook: validatedHook,
                method: 'translated',
              };

              console.log(`✅ Social hook translated to ${targetLang}: ${id}`);
            } else {
              // Generate directly for any non-translation-target languages
              console.log(
                `🎯 Generating native social hook for ${targetLang}: ${id}`
              );

              const hook = await this.generateHook(
                id,
                targetLang,
                commandExecutor
              );
              results[targetLang] = {
                success: true,
                hook,
                method: 'generated',
              };

              console.log(`✅ Social hook generated for ${targetLang}: ${id}`);
            }
          } catch (error) {
            const errorMessage = logError(
              `Social hook processing failed for ${targetLang}`,
              error
            );
            results[targetLang] = {
              success: false,
              error: errorMessage,
              method: 'translated',
            };
          }
        }
      } else {
        // Fallback: Generate for each language individually if Chinese not available
        console.log(
          `⚠️  Chinese source not available, falling back to individual generation`
        );
        return await this.generateAllHooksIndividual(id, commandExecutor);
      }

      // Update source status if all hooks generated successfully
      const allSuccessful = Object.values(results).every((r) => r.success);
      if (allSuccessful) {
        await ContentManager.updateSourceStatus(id, 'social');
        console.log(`🎉 All social hooks completed for: ${id}`);
      } else {
        console.log(`⚠️  Some social hooks failed for: ${id}`);
      }

      return results;
    } catch (error) {
      const errorMessage = logError(
        `Social hook generation pipeline failed for ${id}`,
        error
      );
      throw error;
    }
  }

  // Validate hook length and truncate if necessary
  static validateHookLength(hook: string, language: string): string {
    const socialConfig = getSocialConfig(language);
    const maxLength = socialConfig.hookLength;

    if (hook.length <= maxLength) {
      return hook;
    }

    console.log(
      `⚠️  Hook too long for ${language} (${hook.length}>${maxLength}), truncating...`
    );

    // Truncate at last complete word before limit
    const truncated = hook.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > maxLength * 0.8) {
      // Only truncate at word boundary if we don't lose too much
      return truncated.substring(0, lastSpaceIndex) + '...';
    } else {
      return truncated.substring(0, maxLength - 3) + '...';
    }
  }

  // Generate social hooks for all languages (main entry point)
  static async generateAllHooks(
    id: string,
    commandExecutor: CommandExecutor = executeCommandSync
  ): Promise<Record<string, SocialHookResult>> {
    // Use optimized translation pipeline by default
    return await this.generateAllHooksTranslated(id, commandExecutor);
  }

  // Generate social hooks for all languages (legacy individual method)
  static async generateAllHooksIndividual(
    id: string,
    commandExecutor: CommandExecutor = executeCommandSync
  ): Promise<Record<string, SocialHookResult>> {
    console.log(`📱 Generating social hooks individually for: ${id}`);

    // Check source status first
    const sourceContent = await ContentManager.readSource(id);

    if (sourceContent.status !== 'content') {
      throw new Error(
        `Content must be uploaded before social hooks. Current status: ${sourceContent.status}`
      );
    }

    // Get all available languages for this content
    const availableLanguages = await ContentManager.getAvailableLanguages(id);

    // Get all languages that should have social hooks generated
    const socialHookLanguages = ContentSchema.getAllLanguages().filter(
      (lang) =>
        availableLanguages.includes(lang) && shouldGenerateSocialHooks(lang)
    );

    const results: Record<string, SocialHookResult> = {};

    for (const language of socialHookLanguages) {
      try {
        const hook = await this.generateHook(id, language, commandExecutor);
        const validatedHook = this.validateHookLength(hook, language);
        await ContentManager.addSocialHook(id, language, validatedHook);
        results[language] = {
          success: true,
          hook: validatedHook,
          method: 'generated',
        };
      } catch (error) {
        const errorMessage = logError(
          `Social hook generation failed for ${language}`,
          error
        );
        results[language] = {
          success: false,
          error: errorMessage,
          method: 'generated',
        };
      }
    }

    // Update source status if all hooks generated successfully
    const allSuccessful = Object.values(results).every((r) => r.success);
    if (socialHookLanguages.length === 0 || allSuccessful) {
      await ContentManager.updateSourceStatus(id, 'social');
    }

    return results;
  }

  // Generate social hook using Claude with deep links
  static async generateHookWithClaude(
    title: string,
    content: string,
    language: string,
    commandExecutor: CommandExecutor = executeCommandSync,
    contentId: string | null = null
  ): Promise<string> {
    const languageMap: Record<string, string> = {
      'zh-TW': 'Traditional Chinese',
      'en-US': 'English',
      'ja-JP': 'Japanese',
    };

    const langName = languageMap[language] || 'English';

    // Extract key insight (first meaningful paragraph)
    const keyInsight = content.split('\n\n')[0] || content.substring(0, 200);

    // Generate deep links if contentId is provided
    let linkText = '';
    if (contentId) {
      const deepLink = `fromfedtochain://audio/${contentId}`;
      const webLink = `https://fromfedtochain.com/audio/${contentId}`;
      linkText = `\n\n🎧 Listen: ${deepLink}\n🌐 Web: ${webLink}`;
    }

    const prompt = `Create 1 engaging social media hook for "${title}" in ${langName}.

Key content: ${keyInsight}

Requirements:
- Under 200 characters for the main hook content (links will be added separately)
- Compelling and shareable
- Match ${langName} social media style
- Include mention of Eng | 中 | 日 podcasts available on Apple Podcasts, Spotify
- Focus on the compelling content, deep links will be added automatically

Return only the hook text, no explanations.`;

    try {
      const claudeCommand = `claude -p ${JSON.stringify(prompt)}`;

      const hookResult = commandExecutor(claudeCommand, {
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      });

      const baseHook = hookResult.toString().trim();

      // Add deep links if contentId provided
      return baseHook + linkText;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'ENOENT') {
          throw new Error(
            'Claude command not found. Install with: npm install -g claude-code'
          );
        } else if (error.code === 'SIGTERM') {
          throw new Error('Claude command timed out after 60 seconds');
        }
      }
      const errorMessage = getErrorMessage(error);
      throw new Error(`Social hook generation failed: ${errorMessage}`);
    }
  }

  // Get content needing social hooks
  static async getContentNeedingSocial(): Promise<any[]> {
    return ContentManager.getSourceByStatus('content');
  }

  // Helper methods for configuration
}
