import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, ValidationError } from '@/lib/errors';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      data,
      status: options?.status || 200,
    })),
  },
}));

describe('API Response Helpers', () => {
  let successResponse: any;
  let errorResponse: any;
  let paginatedResponse: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const apiResponsesModule = await import('@/lib/api-responses');
    successResponse = apiResponsesModule.successResponse;
    errorResponse = apiResponsesModule.errorResponse;
    paginatedResponse = apiResponsesModule.paginatedResponse;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('successResponse', () => {
    it('creates success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);

      expect(response.data).toEqual({
        success: true,
        data: { id: '123', name: 'Test' },
      });
      expect(response.status).toBe(200);
    });

    it('allows custom status code', () => {
      const response = successResponse({ created: true }, 201);

      expect(response.status).toBe(201);
    });
  });

  describe('errorResponse', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('creates error response from Error', () => {
      const error = new Error('Something went wrong');
      const response = errorResponse(error);

      expect(response.data).toEqual({
        success: false,
        error: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
        },
      });
      expect(response.status).toBe(500);
    });

    it('creates error response from ApiError', () => {
      const error = new ApiError('Bad request', 400, 'BAD_REQUEST');
      const response = errorResponse(error);

      expect(response.data).toEqual({
        success: false,
        error: {
          message: 'Bad request',
          code: 'BAD_REQUEST',
        },
      });
      expect(response.status).toBe(400);
    });

    it('includes field for ValidationError', () => {
      const error = new ValidationError('Invalid email', 'email');
      const response = errorResponse(error);

      expect(response.data.error.field).toBe('email');
      expect(response.status).toBe(400);
    });

    it('allows status override', () => {
      const error = new Error('Custom');
      const response = errorResponse(error, 418);

      expect(response.status).toBe(418);
    });

    it('logs server errors (5xx)', () => {
      const error = new Error('Internal error');
      errorResponse(error);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('does not log client errors (4xx)', () => {
      const error = new ApiError('Not found', 404);
      errorResponse(error);

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('paginatedResponse', () => {
    it('creates paginated response with items', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = paginatedResponse(items, 1, 10, 25);

      expect(response.data).toEqual({
        success: true,
        data: items,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      });
    });

    it('calculates totalPages correctly', () => {
      const response = paginatedResponse([], 1, 20, 100);

      expect(response.data.pagination.totalPages).toBe(5);
    });

    it('handles single page', () => {
      const response = paginatedResponse([{ id: 1 }], 1, 10, 5);

      expect(response.data.pagination.totalPages).toBe(1);
    });

    it('handles empty results', () => {
      const response = paginatedResponse([], 1, 10, 0);

      expect(response.data.pagination.totalPages).toBe(0);
    });
  });
});
