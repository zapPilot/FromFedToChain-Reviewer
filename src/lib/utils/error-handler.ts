/**
 * Error handling utilities
 * Provides consistent error message extraction and logging across the application
 */

/**
 * Safely extracts error message from unknown error types
 * @param error - The error to extract message from
 * @returns A string error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Logs an error with context and returns the error message
 * @param context - Context description (e.g., "Audio generation failed")
 * @param error - The error to log
 * @param severity - Log level (default: 'error')
 * @returns The extracted error message
 */
export function logError(
  context: string,
  error: unknown,
  severity: 'error' | 'warn' = 'error'
): string {
  const message = getErrorMessage(error);
  console[severity](`${context}: ${message}`);
  return message;
}

/**
 * Creates a formatted error response object
 * @param error - The error to format
 * @returns An object with success: false and error message
 */
export function formatErrorResponse(error: unknown) {
  return {
    success: false,
    error: getErrorMessage(error),
  };
}
