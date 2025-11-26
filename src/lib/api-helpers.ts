/**
 * API route helper utilities
 * Provides consistent error handling and response formatting for Next.js API routes
 */

import { NextResponse } from 'next/server';
import { ApiError } from './errors';
import { errorResponse, successResponse } from './api-responses';

/**
 * Handles API route execution with consistent error handling
 * @param handler - Async function that performs the route logic
 * @param errorContext - Context message for error logging
 * @returns NextResponse with standardized format
 */
export async function handleApiRoute<T>(
  handler: () => Promise<T>,
  errorContext: string
): Promise<NextResponse> {
  try {
    const result = await handler();
    return successResponse(result);
  } catch (error) {
    console.error(`${errorContext}:`, error);

    // Handle known API errors
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    // Handle unknown errors
    return errorResponse(
      new ApiError(
        error instanceof Error ? error.message : 'An unknown error occurred',
        500
      )
    );
  }
}
