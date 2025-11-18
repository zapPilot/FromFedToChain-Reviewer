import { NextRequest, NextResponse } from "next/server";
import { KnowledgeManager } from "@/lib/KnowledgeManager";

/**
 * GET /api/knowledge/stats
 * Get knowledge base statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize knowledge base if needed
    await KnowledgeManager.initialize();

    const stats = await KnowledgeManager.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Failed to get knowledge stats:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get knowledge stats",
      },
      { status: 500 }
    );
  }
}
