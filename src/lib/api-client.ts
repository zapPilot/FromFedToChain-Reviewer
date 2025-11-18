import {
  ContentItem,
  PaginatedResponse,
  ContentDetailResponse,
  ReviewSubmitRequest,
  ReviewSubmitResponse,
  ReviewStats,
  Category,
} from "@/types/content";

const API_BASE = "/api";

class ApiClient {
  private async fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: "An error occurred",
      }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get pending content for review
  async getPendingContent(params?: {
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<ContentItem>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.fetcher(`/review/pending${query ? `?${query}` : ""}`);
  }

  // Get single content with navigation
  async getContentDetail(id: string): Promise<ContentDetailResponse> {
    return this.fetcher(`/review/${id}`);
  }

  // Submit review
  async submitReview(
    id: string,
    data: ReviewSubmitRequest
  ): Promise<ReviewSubmitResponse> {
    return this.fetcher(`/review/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Update category
  async updateCategory(
    id: string,
    category: Category
  ): Promise<{ success: boolean; content: ContentItem }> {
    return this.fetcher(`/review/${id}/category`, {
      method: "PATCH",
      body: JSON.stringify({ category }),
    });
  }

  // Get review stats
  async getStats(): Promise<ReviewStats> {
    return this.fetcher("/review/stats");
  }

  // Get review history
  async getReviewHistory(params?: {
    reviewer?: string;
    decision?: "accepted" | "rejected";
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ContentItem>> {
    const searchParams = new URLSearchParams();
    if (params?.reviewer) searchParams.set("reviewer", params.reviewer);
    if (params?.decision) searchParams.set("decision", params.decision);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return this.fetcher(`/review/history${query ? `?${query}` : ""}`);
  }
}

export const apiClient = new ApiClient();
