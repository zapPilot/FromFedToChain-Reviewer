'use client';

import { useForm, useWatch } from 'react-hook-form';
import { ContentItem, Category } from '@/types/content';
import { reviewFormSchema, ReviewFormData } from '@/lib/validations';
import { ContentSchema } from '@/lib/ContentSchema';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ReviewFormProps {
  content: ContentItem;
  onSubmit: (data: ReviewFormData) => void;
  isSubmitting?: boolean;
}

export function ReviewForm({
  content,
  onSubmit,
  isSubmitting,
}: ReviewFormProps) {
  // Note: Toast notifications for success/failure are handled by the parent component (ReviewPage)
  // or by the caller of onSubmit. We can add additional visual feedback if needed here.
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReviewFormData>({
    defaultValues: {
      action: undefined,
      feedback: '',
      newCategory: content.category,
    },
  });

  const action = useWatch({ control, name: 'action' });
  const categories = ContentSchema.getCategories();

  return (
    <Card className="sticky top-8">
      <CardHeader>
        <CardTitle>Review Decision</CardTitle>
        <CardDescription>
          Review and approve or reject this content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Category Selector */}
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              {...register('newCategory')}
              className="flex h-10 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-1"
            >
              {categories.map((cat) => {
                const info = ContentSchema.getCategoryInfo(cat);
                return (
                  <option key={cat} value={cat}>
                    {info.emoji} {info.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Action Radio Buttons */}
          <div>
            <Label>Decision *</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="accept"
                  value="accept"
                  {...register('action', { required: true })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="accept"
                  className="ml-2 text-sm font-medium text-gray-900"
                >
                  ✅ Accept
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="reject"
                  value="reject"
                  {...register('action', { required: true })}
                  className="h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <label
                  htmlFor="reject"
                  className="ml-2 text-sm font-medium text-gray-900"
                >
                  ❌ Reject
                </label>
              </div>
            </div>
            {errors.action && (
              <p className="text-sm text-red-600 mt-1">
                Please select an action
              </p>
            )}
          </div>

          {/* Feedback Textarea */}
          <div>
            <Label htmlFor="feedback">
              Feedback{' '}
              {action === 'reject' && <span className="text-red-600">*</span>}
            </Label>
            <Textarea
              id="feedback"
              {...register('feedback')}
              placeholder={
                action === 'reject'
                  ? 'Please provide feedback (required for rejection)'
                  : 'Optional feedback or comments'
              }
              className="mt-1"
              rows={4}
            />
            {errors.feedback && (
              <p className="text-sm text-red-600 mt-1">
                {errors.feedback.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            variant={action === 'reject' ? 'destructive' : 'default'}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
