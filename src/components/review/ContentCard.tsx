import Link from "next/link";
import { ContentItem } from "@/types/content";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryBadge } from "./CategoryBadge";
import { StatusBadge } from "./StatusBadge";

interface ContentCardProps {
  content: ContentItem;
}

export function ContentCard({ content }: ContentCardProps) {
  // Truncate content preview
  const contentPreview =
    content.content.length > 150
      ? content.content.substring(0, 150) + "..."
      : content.content;

  return (
    <Link href={`/review/${content.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 mb-2">
            <CategoryBadge category={content.category} />
            <StatusBadge status={content.status} />
          </div>
          <CardTitle className="text-lg line-clamp-2">{content.title}</CardTitle>
          <CardDescription className="text-xs">
            {new Date(content.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 line-clamp-3">{contentPreview}</p>
          {content.references && content.references.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {content.references.length} reference
              {content.references.length !== 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
