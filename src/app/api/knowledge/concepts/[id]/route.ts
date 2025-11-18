import { NextRequest, NextResponse } from "next/server";
import { KnowledgeManager } from "@/lib/KnowledgeManager";

/**
 * GET /api/knowledge/concepts/[id]
 * Get a single concept by ID or name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Initialize knowledge base if needed
    await KnowledgeManager.initialize();

    const concept = await KnowledgeManager.getConcept(id);

    if (!concept) {
      return NextResponse.json(
        {
          success: false,
          error: `Concept not found: ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: concept,
    });
  } catch (error) {
    console.error("Failed to get concept:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get concept",
      },
      { status: 500 }
    );
  }
}
