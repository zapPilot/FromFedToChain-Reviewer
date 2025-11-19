'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ContentCard } from '@/components/review/ContentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function ReviewHistoryPage() {
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState<'accepted' | 'rejected' | ''>('');
  const limit = 12;

  const { data, isLoading } = useQuery({
    queryKey: [
      'review-history',
      { page, limit, decision: decision || undefined },
    ],
    queryFn: () =>
      apiClient.getReviewHistory({
        page,
        limit,
        decision: decision || undefined,
      }),
  });

  const content = data?.content || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Review History
        </h2>
        <p className="text-gray-700">
          View all reviewed content with decisions
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value as any)}
          className="flex h-10 w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <option value="">All Decisions</option>
          <option value="accepted">✅ Accepted Only</option>
          <option value="rejected">❌ Rejected Only</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}

      {/* Content Grid */}
      {!isLoading && content.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {content.map((item) => (
              <div key={item.id} className="relative">
                <ContentCard content={item} />
                {/* Show review decision badge */}
                {item.feedback?.content_review && (
                  <div className="absolute top-2 right-2">
                    {item.feedback.content_review.status === 'accepted' ? (
                      <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        ✓ Accepted
                      </span>
                    ) : (
                      <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        ✗ Rejected
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && content.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📜</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No review history
          </h3>
          <p className="text-gray-600">
            {decision
              ? `No ${decision} content found`
              : 'Start reviewing content to see history'}
          </p>
        </div>
      )}
    </div>
  );
}
