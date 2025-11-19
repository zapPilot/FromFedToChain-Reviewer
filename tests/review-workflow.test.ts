import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { ContentManager } from '@/lib/ContentManager';
import { TestUtils } from './setup';

const CONTENT_ID = '2025-06-30-review-test';

describe('Review workflow', () => {
  let tempDir: string;
  let originalDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    originalDir = ContentManager.CONTENT_DIR;
    ContentManager.CONTENT_DIR = tempDir;

    const draft = TestUtils.createContent({ id: CONTENT_ID, status: 'draft' });
    await TestUtils.writeContentFile(tempDir, draft);
  });

  afterEach(async () => {
    ContentManager.CONTENT_DIR = originalDir;
    await TestUtils.cleanupTempDir(tempDir);
  });

  it('adds feedback when accepting content', async () => {
    await ContentManager.addContentFeedback(
      CONTENT_ID,
      'accepted',
      5,
      'reviewer',
      'Great content'
    );

    const updated = await ContentManager.readSource(CONTENT_ID);
    expect(updated.feedback.content_review?.status).toBe('accepted');
    expect(updated.feedback.content_review?.comments).toBe('Great content');
  });

  it('requires rejection feedback comment', async () => {
    await expect(
      ContentManager.addContentFeedback(
        CONTENT_ID,
        'rejected',
        1,
        'reviewer',
        ''
      )
    ).rejects.toThrow('Feedback comment is required when rejecting content');
  });

  it('updates review history ordering', async () => {
    await ContentManager.addContentFeedback(
      CONTENT_ID,
      'accepted',
      4,
      'reviewer',
      'Approved'
    );

    const history = await ContentManager.getReviewHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(CONTENT_ID);
  });
});
