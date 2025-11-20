/**
 * API route helper utilities
 * Provides consistent error handling and response formatting for Next.js API routes
 */

import { NextResponse } from 'next/server';
import { getErrorMessage } from './utils/error-handler';

/**
 * Handles API route execution with consistent error handling
 * @param handler - Async function that performs the route logic
 * @param errorContext - Context message for error logging
 * @returns NextResponse with handler result directly (not wrapped)
 */
export async function handleApiRoute<T>(
  handler: () => Promise<T>,
  errorContext: string
): Promise<NextResponse> {
  try {
    const result = await handler();
    // Return result directly to preserve original response shapes
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`${errorContext}: ${message}`);
    return NextResponse.json(
      {
        error: errorContext,
        message: message,
      },
      { status: 500 }
    );
  }
}
