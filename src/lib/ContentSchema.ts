import { Language, Category, Status } from "@/types/content";

export class ContentSchema {
  // Get supported languages for translation
  static getSupportedLanguages(): Language[] {
    return ["en-US", "ja-JP"];
  }

  // Get all languages including source
  static getAllLanguages(): Language[] {
    return ["zh-TW", ...this.getSupportedLanguages()];
  }

  // Get content categories
  static getCategories(): Category[] {
    return ["daily-news", "ethereum", "macro", "startup", "ai", "defi"];
  }

  // Get status workflow states
  static getStatuses(): Status[] {
    return [
      "draft",
      "reviewed",
      "translated",
      "wav",
      "m3u8",
      "cloudflare",
      "content",
      "social",
    ];
  }

  // Get category display info
  static getCategoryInfo(category: Category): { name: string; emoji: string } {
    const info: Record<Category, { name: string; emoji: string }> = {
      "daily-news": { name: "Daily News", emoji: "📰" },
      ethereum: { name: "Ethereum", emoji: "⚡" },
      macro: { name: "Macro Economics", emoji: "📊" },
      startup: { name: "Startup", emoji: "🚀" },
      ai: { name: "AI", emoji: "🤖" },
      defi: { name: "DeFi", emoji: "💎" },
    };
    return info[category];
  }

  // Get language display info
  static getLanguageInfo(language: Language): { name: string; flag: string } {
    const info: Record<Language, { name: string; flag: string }> = {
      "zh-TW": { name: "繁體中文", flag: "🇹🇼" },
      "en-US": { name: "English", flag: "🇺🇸" },
      "ja-JP": { name: "日本語", flag: "🇯🇵" },
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
        name: "Draft",
        color: "text-gray-700",
        bgColor: "bg-gray-100",
      },
      reviewed: {
        name: "Reviewed",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
      },
      translated: {
        name: "Translated",
        color: "text-purple-700",
        bgColor: "bg-purple-100",
      },
      wav: {
        name: "Audio Generated",
        color: "text-green-700",
        bgColor: "bg-green-100",
      },
      m3u8: {
        name: "M3U8 Generated",
        color: "text-indigo-700",
        bgColor: "bg-indigo-100",
      },
      cloudflare: {
        name: "Uploaded",
        color: "text-orange-700",
        bgColor: "bg-orange-100",
      },
      content: {
        name: "Content Ready",
        color: "text-teal-700",
        bgColor: "bg-teal-100",
      },
      social: {
        name: "Published",
        color: "text-emerald-700",
        bgColor: "bg-emerald-100",
      },
    };
    return info[status];
  }
}
