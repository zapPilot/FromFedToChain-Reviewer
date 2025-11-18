import { Category } from "@/types/content";
import { ContentSchema } from "@/lib/ContentSchema";
import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  category: Category;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const info = ContentSchema.getCategoryInfo(category);

  return (
    <Badge variant="outline" className="font-medium">
      <span className="mr-1">{info.emoji}</span>
      {info.name}
    </Badge>
  );
}
