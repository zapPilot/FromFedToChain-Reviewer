import { describe, it, expect } from 'vitest';
import { R2Utils } from '@/lib/services/pipeline/R2Utils';

describe('R2Utils', () => {
  describe('parseRcloneLsOutput', () => {
    it('parses valid output correctly', () => {
      const output = `
        1234 segment001.ts
         567 segment002.ts
      `;
      const files = R2Utils.parseRcloneLsOutput(output);
      expect(files).toEqual(['segment001.ts', 'segment002.ts']);
    });

    it('ignores non-ts files or malformed lines', () => {
      const output = `
        1234 segment001.ts
        123 playlist.m3u8
        junk line
      `;
      const files = R2Utils.parseRcloneLsOutput(output);
      expect(files).toEqual(['segment001.ts']);
    });

    it('returns empty array for empty output', () => {
      expect(R2Utils.parseRcloneLsOutput('')).toEqual([]);
    });

    it('handles output without leading whitespace', () => {
      const output = '1234 segment001.ts';
      const files = R2Utils.parseRcloneLsOutput(output);
      expect(files).toEqual(['segment001.ts']);
    });
  });

  describe('sortSegmentFiles', () => {
    it('sorts segments numerically', () => {
      const files = ['segment10.ts', 'segment1.ts', 'segment2.ts'];
      const sorted = R2Utils.sortSegmentFiles(files);
      expect(sorted).toEqual(['segment1.ts', 'segment2.ts', 'segment10.ts']);
    });

    it('handles empty array', () => {
      expect(R2Utils.sortSegmentFiles([])).toEqual([]);
    });

    it('handles single file', () => {
      expect(R2Utils.sortSegmentFiles(['segment1.ts'])).toEqual([
        'segment1.ts',
      ]);
    });
  });
});
