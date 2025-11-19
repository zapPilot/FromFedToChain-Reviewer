'use client';

import { Input } from '@/components/ui/input';
import { Category } from '@/types/content';
import { ContentSchema } from '@/lib/ContentSchema';

interface FilterBarProps {
  category: string;
  search: string;
  onCategoryChange: (category: string) => void;
  onSearchChange: (search: string) => void;
}

export function FilterBar({
  category,
  search,
  onCategoryChange,
  onSearchChange,
}: FilterBarProps) {
  const categories = ContentSchema.getCategories();

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="w-full sm:w-64">
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <option value="">All Categories</option>
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
      <div className="flex-1">
        <Input
          type="search"
          placeholder="Search by title or content..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
