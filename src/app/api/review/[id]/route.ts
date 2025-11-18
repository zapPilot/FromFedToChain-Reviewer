import { NextRequest, NextResponse } from "next/server";
import { ContentManager } from "@/lib/ContentManager";
import { ContentDetailResponse, NavigationInfo } from "@/types/content";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the requested content
    const content = await ContentManager.readSource(id);

    // Get all pending content for navigation
    const allPending = await ContentManager.getSourceForReview();
    const currentIndex = allPending.findIndex((c) => c.id === id);

    // Calculate navigation
    const navigation: NavigationInfo = {
      previous: currentIndex > 0 ? allPending[currentIndex - 1].id : null,
      next:
        currentIndex < allPending.length - 1
          ? allPending[currentIndex + 1].id
          : null,
    };

    const response: ContentDetailResponse = {
      content,
      navigation,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      {
        error: "Content not found",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 404 }
    );
  }
}
