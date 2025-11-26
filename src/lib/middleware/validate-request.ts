import { NextRequest } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../errors';

/**
 * Validates request body against a Zod schema
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(firstError.message, firstError.path.join('.'));
    }
    throw error;
  }
}

/**
 * Validates query parameters against a Zod schema
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(firstError.message, firstError.path.join('.'));
    }
    throw error;
  }
}
