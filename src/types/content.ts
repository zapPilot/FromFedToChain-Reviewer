// Content types based on ContentSchema from FromFedToChain

export type Language = "zh-TW" | "en-US" | "ja-JP";

export type Category =
  | "daily-news"
  | "ethereum"
  | "macro"
  | "startup"
  | "ai"
  | "defi";

export type Status =
  | "draft"
  | "reviewed"
  | "translated"
  | "wav"
  | "m3u8"
  | "cloudflare"
  | "content"
  | "social";

export type ReviewStatus = "accepted" | "rejected";

export interface ContentReviewFeedback {
  status: ReviewStatus;
  score: number;
  reviewer: string;
  timestamp: string;
  comments: string;
}

export interface ContentFeedback {
  content_review: ContentReviewFeedback | null;
}

export interface StreamingUrls {
  m3u8: string;
  cloudflare: string;
}

export interface ContentItem {
  id: string;
  status: Status;
  category: Category;
  date: string; // ISO date string
  language: Language;
  title: string;
  content: string;
  references: string[];
  framework?: string;
  audio_file: string | null;
  social_hook: string | null;
  knowledge_concepts_used?: string[];
  feedback: ContentFeedback;
  updated_at: string; // ISO timestamp
  streaming_urls?: StreamingUrls;
}

export interface PaginatedResponse<T> {
  content: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ReviewSubmitRequest {
  action: "accept" | "reject";
  feedback: string;
  newCategory?: Category;
}

export interface ReviewSubmitResponse {
  success: boolean;
  content: ContentItem;
  message: string;
}

export interface ReviewStats {
  pending: number;
  reviewed: number;
  rejected: number;
  total: number;
  byCategory: Record<Category, number>;
}

export interface NavigationInfo {
  previous: string | null;
  next: string | null;
}

export interface ContentDetailResponse {
  content: ContentItem;
  navigation: NavigationInfo;
}
