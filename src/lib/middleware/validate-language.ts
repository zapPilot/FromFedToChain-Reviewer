import { isSupportedLanguage } from '@/config/languages';
import type { Language } from '@/types/content';

export function validateLanguage(language: unknown): Language {
  if (!isSupportedLanguage(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return language as Language;
}
