import { describe, it, expect } from 'vitest';
import {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
} from '@/lib/errors';

describe('Custom Error Types', () => {
  describe('ApiError', () => {
    it('creates error with default values', () => {
      const error = new ApiError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeUndefined();
      expect(error.name).toBe('ApiError');
      expect(error).toBeInstanceOf(Error);
    });

    it('creates error with custom status code', () => {
      const error = new ApiError('Bad request', 400);

      expect(error.statusCode).toBe(400);
    });

    it('creates error with custom code', () => {
      const error = new ApiError('Custom error', 500, 'CUSTOM_ERROR');

      expect(error.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('creates validation error with message', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
      expect(error.field).toBeUndefined();
    });

    it('creates validation error with field', () => {
      const error = new ValidationError('Email is invalid', 'email');

      expect(error.field).toBe('email');
    });

    it('extends ApiError', () => {
      const error = new ValidationError('Invalid');

      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe('NotFoundError', () => {
    it('creates not found error for resource', () => {
      const error = new NotFoundError('Content');

      expect(error.message).toBe('Content not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('creates not found error with resource ID', () => {
      const error = new NotFoundError('Content', 'test-123');

      expect(error.message).toBe("Content with ID 'test-123' not found");
      expect(error.resourceId).toBe('test-123');
    });
  });

  describe('UnauthorizedError', () => {
    it('creates error with default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized access');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('creates error with custom message', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.message).toBe('Invalid token');
    });
  });

  describe('ForbiddenError', () => {
    it('creates error with default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Access forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('ForbiddenError');
    });

    it('creates error with custom message', () => {
      const error = new ForbiddenError('Insufficient permissions');

      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('ConflictError', () => {
    it('creates conflict error', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('RateLimitError', () => {
    it('creates error with default message', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.name).toBe('RateLimitError');
      expect(error.retryAfter).toBeUndefined();
    });

    it('creates error with custom message and retryAfter', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.retryAfter).toBe(60);
    });
  });
});
