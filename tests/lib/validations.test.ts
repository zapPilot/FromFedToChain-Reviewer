import { describe, it, expect } from 'vitest';
import { reviewFormSchema, type ReviewFormData } from '@/lib/validations';

describe('Review Form Validation', () => {
  describe('reviewFormSchema', () => {
    it('validates accept action without feedback', () => {
      const data: ReviewFormData = {
        action: 'accept',
        feedback: '',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('validates accept action with feedback', () => {
      const data: ReviewFormData = {
        action: 'accept',
        feedback: 'Great content!',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('validates reject action with feedback', () => {
      const data: ReviewFormData = {
        action: 'reject',
        feedback: 'Needs more detail',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('fails reject action without feedback', () => {
      const data: ReviewFormData = {
        action: 'reject',
        feedback: '',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Feedback is required when rejecting content'
        );
        expect(result.error.issues[0].path).toEqual(['feedback']);
      }
    });

    it('fails reject action with whitespace-only feedback', () => {
      const data: ReviewFormData = {
        action: 'reject',
        feedback: '   ',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('fails invalid action', () => {
      const data = {
        action: 'maybe',
        feedback: '',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('accepts optional newCategory', () => {
      const data = {
        action: 'accept',
        feedback: '',
        newCategory: 'ethereum',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newCategory).toBe('ethereum');
      }
    });
  });
});
