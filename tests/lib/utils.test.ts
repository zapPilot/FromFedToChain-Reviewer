import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('handles false conditions', () => {
    const isActive = false;
    expect(cn('base', isActive && 'active')).toBe('base');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });
});
