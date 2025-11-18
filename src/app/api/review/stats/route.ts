import { NextResponse } from "next/server";
import { ContentManager } from "@/lib/ContentManager";
import { ReviewStats, Category } from "@/types/content";
import { ContentSchema } from "@/lib/ContentSchema";

export async function GET() {
  try {
    // Get all source content
    const allContent = await ContentManager.list(null, "zh-TW");

    // Count pending (draft, not rejected)
    const pending = allContent.filter((c) => {
      if (c.status !== "draft") return false;
      const review = c.feedback?.content_review;
      return !review || review.status !== "rejected";
    }).length;

    // Count reviewed (accepted)
    const reviewed = allContent.filter(
      (c) => c.feedback?.content_review?.status === "accepted"
    ).length;

    // Count rejected
    const rejected = allContent.filter(
      (c) => c.feedback?.content_review?.status === "rejected"
    ).length;

    // Count by category (only pending content)
    const byCategory: Record<Category, number> = {
      "daily-news": 0,
      ethereum: 0,
      macro: 0,
      startup: 0,
      ai: 0,
      defi: 0,
    };

    allContent
      .filter((c) => {
        if (c.status !== "draft") return false;
        const review = c.feedback?.content_review;
        return !review || review.status !== "rejected";
      })
      .forEach((c) => {
        byCategory[c.category]++;
      });

    const stats: ReviewStats = {
      pending,
      reviewed,
      rejected,
      total: allContent.length,
      byCategory,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch stats",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
