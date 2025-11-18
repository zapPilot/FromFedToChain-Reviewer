import { NextRequest, NextResponse } from "next/server";
import { ContentManager } from "@/lib/ContentManager";
import {
  ReviewSubmitRequest,
  ReviewSubmitResponse,
  Category,
} from "@/types/content";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ReviewSubmitRequest = await request.json();
    const { action, feedback, newCategory } = body;

    // Validate required feedback for rejection
    if (action === "reject" && (!feedback || !feedback.trim())) {
      return NextResponse.json(
        {
          success: false,
          message: "Feedback is required when rejecting content",
        },
        { status: 400 }
      );
    }

    // Update category if changed
    if (newCategory) {
      await ContentManager.updateSourceCategory(id, newCategory as Category);
    }

    // Add feedback
    const score = action === "accept" ? 4 : 2;
    const reviewer = "reviewer_web"; // Default reviewer name for web interface
    await ContentManager.addContentFeedback(
      id,
      action === "accept" ? "accepted" : "rejected",
      score,
      reviewer,
      feedback || "Approved for translation"
    );

    // Update status if accepted
    if (action === "accept") {
      await ContentManager.updateSourceStatus(id, "reviewed");
    }

    // Get updated content
    const updatedContent = await ContentManager.readSource(id);

    const response: ReviewSubmitResponse = {
      success: true,
      content: updatedContent,
      message: `Content ${action}ed successfully`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
