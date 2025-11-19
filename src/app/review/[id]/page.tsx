'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useContentDetail, useReviewSubmit } from '@/hooks/useContentDetail';
import { ContentDisplay } from '@/components/review/ContentDisplay';
import { ReviewForm } from '@/components/review/ReviewForm';
import { NavigationButtons } from '@/components/review/NavigationButtons';
import { Skeleton } from '@/components/ui/skeleton';
import { ReviewFormData } from '@/lib/validations';

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, error } = useContentDetail(id);
  const reviewMutation = useReviewSubmit();

  const content = data?.content;
  const navigation = data?.navigation;

  // Handle review submission
  const handleSubmit = async (formData: ReviewFormData) => {
    try {
      await reviewMutation.mutateAsync({
        id,
        data: {
          action: formData.action,
          feedback: formData.feedback,
          newCategory: formData.newCategory as any,
        },
      });

      // Navigate to next content or back to queue
      if (navigation?.next) {
        router.push(`/review/${navigation.next}`);
      } else {
        router.push('/review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Navigate with arrow keys (when not in input/textarea)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' && navigation?.previous) {
        router.push(`/review/${navigation.previous}`);
      } else if (e.key === 'ArrowRight' && navigation?.next) {
        router.push(`/review/${navigation.next}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation, router]);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !content || !navigation) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Content Not Found
        </h2>
        <p className="text-gray-700 mb-4">
          {error instanceof Error
            ? error.message
            : 'The content could not be loaded'}
        </p>
        <button
          onClick={() => router.push('/review')}
          className="text-blue-600 hover:underline"
        >
          Back to Review Queue
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation */}
      <NavigationButtons navigation={navigation} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Display */}
        <div className="lg:col-span-2">
          <ContentDisplay content={content} />
        </div>

        {/* Review Form */}
        <div>
          <ReviewForm
            content={content}
            onSubmit={handleSubmit}
            isSubmitting={reviewMutation.isPending}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>💡 Tip: Use ← → arrow keys to navigate between content</p>
      </div>
    </div>
  );
}
