"use client";

import { useState } from "react";
import { useReviewQueue, useReviewStats } from "@/hooks/useReviewQueue";
import { StatsCards } from "@/components/review/StatsCards";
import { FilterBar } from "@/components/review/FilterBar";
import { ContentCard } from "@/components/review/ContentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function ReviewQueuePage() {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  const { data: statsData, isLoading: statsLoading } = useReviewStats();
  const { data, isLoading, error } = useReviewQueue({
    category: category || undefined,
    search: search || undefined,
    page,
    limit,
  });

  const content = data?.content || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Review Queue</h2>
        <p className="text-gray-600">
          Review and approve content for translation
        </p>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : statsData ? (
        <StatsCards stats={statsData} />
      ) : null}

      {/* Filters */}
      <FilterBar
        category={category}
        search={search}
        onCategoryChange={setCategory}
        onSearchChange={setSearch}
      />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Error loading content</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

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
              <ContentCard key={item.id} content={item} />
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
              <span className="text-sm text-gray-600">
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
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No content to review
          </h3>
          <p className="text-gray-500">
            {search || category
              ? "Try adjusting your filters"
              : "All content has been reviewed!"}
          </p>
        </div>
      )}
    </div>
  );
}
