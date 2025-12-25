import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('Query Keys', () => {
  describe('contentDetail', () => {
    it('creates content detail key', () => {
      expect(queryKeys.contentDetail('abc-123')).toEqual([
        'content-detail',
        'abc-123',
      ]);
    });
  });

  describe('reviewQueue', () => {
    it('creates review queue key without params', () => {
      expect(queryKeys.reviewQueue()).toEqual(['review-queue', undefined]);
    });

    it('creates review queue key with params', () => {
      const params = { status: 'pending', page: 1 };
      expect(queryKeys.reviewQueue(params)).toEqual(['review-queue', params]);
    });
  });

  describe('reviewStats', () => {
    it('creates review stats key', () => {
      expect(queryKeys.reviewStats()).toEqual(['review-stats']);
    });
  });

  describe('workflowStatus', () => {
    it('creates workflow status key', () => {
      expect(queryKeys.workflowStatus('audio-gen', 'content-123')).toEqual([
        'workflow-status',
        'audio-gen',
        'content-123',
      ]);
    });
  });
});
