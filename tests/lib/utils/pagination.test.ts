import { describe, it, expect } from 'vitest';
import { paginate } from '@/lib/utils/pagination';

describe('paginate', () => {
  const testItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  describe('basic pagination', () => {
    it('returns first page of items', () => {
      const result = paginate(testItems, 1, 3);

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.totalPages).toBe(4);
    });

    it('returns second page of items', () => {
      const result = paginate(testItems, 2, 3);

      expect(result.items).toEqual([4, 5, 6]);
      expect(result.pagination.page).toBe(2);
    });

    it('returns last page with remaining items', () => {
      const result = paginate(testItems, 4, 3);

      expect(result.items).toEqual([10]);
      expect(result.pagination.totalPages).toBe(4);
    });

    it('returns all items on single page', () => {
      const result = paginate(testItems, 1, 20);

      expect(result.items).toHaveLength(10);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty array', () => {
      const result = paginate([], 1, 10);

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('handles page beyond total pages', () => {
      const result = paginate(testItems, 100, 3);

      expect(result.items).toEqual([]);
      expect(result.pagination.page).toBe(100);
    });

    it('handles exact page boundary', () => {
      const result = paginate([1, 2, 3, 4], 2, 2);

      expect(result.items).toEqual([3, 4]);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('works with single item per page', () => {
      const result = paginate(testItems, 5, 1);

      expect(result.items).toEqual([5]);
      expect(result.pagination.totalPages).toBe(10);
    });
  });

  describe('type safety', () => {
    it('works with string arrays', () => {
      const strings = ['a', 'b', 'c', 'd'];
      const result = paginate(strings, 1, 2);

      expect(result.items).toEqual(['a', 'b']);
    });

    it('works with object arrays', () => {
      const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = paginate(objects, 1, 2);

      expect(result.items).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });
});
