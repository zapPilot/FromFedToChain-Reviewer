import { NextResponse } from 'next/server';
import { ApiError } from './errors';

// Standard API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message: string;
    field?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Success response helper
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

// Error response helper
export function errorResponse(
  error: Error | ApiError,
  status?: number
): NextResponse<ApiResponse> {
  const isApiError = error instanceof ApiError;
  const statusCode = status || (isApiError ? error.statusCode : 500);

  const response: ApiResponse = {
    success: false,
    error: {
      message: error.message,
      code: isApiError ? error.code : 'INTERNAL_ERROR',
    },
  };

  // Add field for validation errors
  if (isApiError && 'field' in error && typeof error.field === 'string') {
    response.error!.field = error.field;
  }

  // Log server errors
  if (statusCode >= 500) {
    console.error('Server error:', error);
  }

  return NextResponse.json(response, { status: statusCode });
}

// Paginated response helper
export function paginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
