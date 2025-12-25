import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getErrorMessage,
  logError,
  formatErrorResponse,
} from '@/lib/utils/error-handler';

describe('Error Handler Utilities', () => {
  describe('getErrorMessage', () => {
    it('extracts message from Error instance', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('converts string to message', () => {
      expect(getErrorMessage('Simple error')).toBe('Simple error');
    });

    it('converts number to message', () => {
      expect(getErrorMessage(404)).toBe('404');
    });

    it('converts object to string', () => {
      const obj = { code: 'ERR' };
      expect(getErrorMessage(obj)).toBe('[object Object]');
    });

    it('handles null', () => {
      expect(getErrorMessage(null)).toBe('null');
    });

    it('handles undefined', () => {
      expect(getErrorMessage(undefined)).toBe('undefined');
    });
  });

  describe('logError', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = {
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('logs error with context and returns message', () => {
      const error = new Error('Database failed');
      const result = logError('Connection error', error);

      expect(result).toBe('Database failed');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Connection error: Database failed'
      );
    });

    it('logs warning when severity is warn', () => {
      const error = new Error('Rate limited');
      const result = logError('API warning', error, 'warn');

      expect(result).toBe('Rate limited');
      expect(consoleSpy.warn).toHaveBeenCalledWith('API warning: Rate limited');
    });

    it('handles string errors', () => {
      const result = logError('Operation failed', 'Unknown error');

      expect(result).toBe('Unknown error');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Operation failed: Unknown error'
      );
    });
  });

  describe('formatErrorResponse', () => {
    it('formats Error instance', () => {
      const error = new Error('Not found');
      const response = formatErrorResponse(error);

      expect(response).toEqual({
        success: false,
        error: 'Not found',
      });
    });

    it('formats string error', () => {
      const response = formatErrorResponse('Something broke');

      expect(response).toEqual({
        success: false,
        error: 'Something broke',
      });
    });
  });
});
