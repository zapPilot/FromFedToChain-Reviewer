import { Language, Category, Status, ContentItem } from '@/types/content';

export class ContentSchema {
  static createContent(
    id: string,
    category: Category,
    language: Language,
    title: string,
    content: string,
    references: string[] = [],
    framework = ''
  ): ContentItem {
    return {
      id,
      status: 'draft',
      category,
      date: new Date().toISOString().split('T')[0],
      language,
      title,
      content,
      references,
      framework,
      audio_file: null,
      social_hook: null,
      knowledge_concepts_used: [],
      feedback: {
        content_review: null,
      },
      updated_at: new Date().toISOString(),
    };
  }
  // Get supported languages for translation
  static getSupportedLanguages(): Language[] {
    return ['en-US', 'ja-JP'];
  }

  // Get all languages including source
  static getAllLanguages(): Language[] {
    return ['zh-TW', ...this.getSupportedLanguages()];
  }

  static getSocialPlatforms(): string[] {
    return ['twitter', 'threads', 'farcaster', 'debank'];
  }

  // Get content categories
  static getCategories(): Category[] {
    return ['daily-news', 'ethereum', 'macro', 'startup', 'ai', 'defi'];
  }

  // Get status workflow states
  static getStatuses(): Status[] {
    return [
      'draft',
      'reviewed',
      'translated',
      'wav',
      'm3u8',
      'cloudflare',
      'content',
      'social',
    ];
  }

  // Get category display info
  static getCategoryInfo(category: Category): { name: string; emoji: string } {
    const info: Record<Category, { name: string; emoji: string }> = {
      'daily-news': { name: 'Daily News', emoji: '📰' },
      ethereum: { name: 'Ethereum', emoji: '⚡' },
      macro: { name: 'Macro Economics', emoji: '📊' },
      startup: { name: 'Startup', emoji: '🚀' },
      ai: { name: 'AI', emoji: '🤖' },
      defi: { name: 'DeFi', emoji: '💎' },
    };
    return info[category];
  }

  // Get language display info
  static getLanguageInfo(language: Language): { name: string; flag: string } {
    const info: Record<Language, { name: string; flag: string }> = {
      'zh-TW': { name: '繁體中文', flag: '🇹🇼' },
      'en-US': { name: 'English', flag: '🇺🇸' },
      'ja-JP': { name: '日本語', flag: '🇯🇵' },
    };
    return info[language];
  }

  // Get status display info
  static getStatusInfo(status: Status): {
    name: string;
    color: string;
    bgColor: string;
  } {
    const info: Record<
      Status,
      { name: string; color: string; bgColor: string }
    > = {
      draft: {
        name: 'Draft',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
      },
      reviewed: {
        name: 'Reviewed',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
      },
      translated: {
        name: 'Translated',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
      },
      wav: {
        name: 'Audio Generated',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
      },
      m3u8: {
        name: 'M3U8 Generated',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-100',
      },
      cloudflare: {
        name: 'Uploaded',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
      },
      content: {
        name: 'Content Ready',
        color: 'text-teal-700',
        bgColor: 'bg-teal-100',
      },
      social: {
        name: 'Published',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-100',
      },
    };
    return info[status];
  }

  static validate(
    content: Partial<ContentItem> & Record<string, any>
  ): boolean {
    const required: (keyof ContentItem)[] = [
      'id',
      'status',
      'category',
      'date',
      'language',
      'title',
      'content',
      'references',
      'feedback',
      'updated_at',
    ];

    for (const field of required) {
      if (content[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!this.getCategories().includes(content.category as Category)) {
      throw new Error(`Invalid category: ${content.category}`);
    }

    if (!this.getStatuses().includes(content.status as Status)) {
      throw new Error(`Invalid status: ${content.status}`);
    }

    if (!this.getAllLanguages().includes(content.language as Language)) {
      throw new Error(`Invalid language: ${content.language}`);
    }

    if (!content.title || !content.content) {
      throw new Error('Title and content are required');
    }

    if (
      content.framework !== undefined &&
      content.framework !== null &&
      typeof content.framework !== 'string'
    ) {
      throw new Error('Framework must be a string if provided');
    }

    if (
      content.knowledge_concepts_used !== undefined &&
      !Array.isArray(content.knowledge_concepts_used)
    ) {
      throw new Error('knowledge_concepts_used must be an array if provided');
    }

    return true;
  }

  static getExample(): ContentItem {
    return this.createContent(
      '2025-06-30-example-content',
      'daily-news',
      'zh-TW',
      'Example Bitcoin Analysis',
      'This is example content about Bitcoin trends...',
      ['Example Source 1', 'Example Source 2'],
      '万维钢风格.md'
    );
  }

  static getPipelineConfig() {
    return [
      {
        status: 'reviewed',
        nextStatus: 'translated',
        service: 'TranslationService',
        method: 'translateAll',
        description: 'Content needs to be translated',
        phase: 'translation',
      },
      {
        status: 'translated',
        nextStatus: 'wav',
        service: 'AudioService',
        method: 'generateWavOnly',
        description: 'Generate WAV audio from translated text',
        phase: 'audio',
      },
      {
        status: 'wav',
        nextStatus: 'm3u8',
        service: 'M3U8AudioService',
        method: 'convertToM3U8',
        description: 'Generate HLS (M3U8) streaming format',
        phase: 'audio',
      },
      {
        status: 'm3u8',
        nextStatus: 'cloudflare',
        service: 'CloudflareR2Service',
        method: 'uploadAudioFiles',
        description: 'Upload audio files to Cloudflare R2',
        phase: 'audio',
      },
      {
        status: 'cloudflare',
        nextStatus: 'content',
        service: 'ContentUpload',
        method: 'uploadContentToCloudflareStep',
        description: 'Upload content files to Cloudflare R2',
        phase: 'content',
      },
      {
        status: 'content',
        nextStatus: 'social',
        service: 'SocialService',
        method: 'generateAllHooks',
        description: 'Generate social media hooks',
        phase: 'social',
      },
    ];
  }

  static getPipelineStep(status: Status) {
    return this.getPipelineConfig().find((step) => step.status === status);
  }

  static getNextStatus(status: Status) {
    return this.getPipelineStep(status)?.nextStatus ?? null;
  }

  static getPipelinePhases() {
    const phases = new Set<string>();
    this.getPipelineConfig().forEach((step) => phases.add(step.phase));
    return Array.from(phases);
  }
}
