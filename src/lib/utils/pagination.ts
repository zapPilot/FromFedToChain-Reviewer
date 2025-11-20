/**
 * Pagination utilities
 * Provides consistent pagination logic across the application
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Paginate an array of items
 * @param items - Array of items to paginate
 * @param page - Page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Paginated result with items and metadata
 */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginatedItems = items.slice(start, start + limit);

  return {
    items: paginatedItems,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
