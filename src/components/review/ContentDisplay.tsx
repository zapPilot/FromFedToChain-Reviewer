import { ContentItem } from '@/types/content';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CategoryBadge } from './CategoryBadge';
import { StatusBadge } from './StatusBadge';
import { ContentSchema } from '@/lib/ContentSchema';

interface ContentDisplayProps {
  content: ContentItem;
}

export function ContentDisplay({ content }: ContentDisplayProps) {
  const languageInfo = ContentSchema.getLanguageInfo(content.language);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex flex-wrap gap-2">
            <CategoryBadge category={content.category} />
            <StatusBadge status={content.status} />
          </div>
          <span className="text-2xl">{languageInfo.flag}</span>
        </div>
        <CardTitle className="text-2xl">{content.title}</CardTitle>
        <CardDescription>
          {new Date(content.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Content Text */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              Content
            </h3>
            <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto">
              <p className="whitespace-pre-wrap text-gray-800">
                {content.content}
              </p>
            </div>
          </div>

          {/* References */}
          {content.references && content.references.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                References
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {content.references.map((ref, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    {ref}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Framework */}
          {content.framework && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Writing Framework
              </h3>
              <p className="text-sm text-gray-700">{content.framework}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            <p>ID: {content.id}</p>
            <p>
              Last updated:{' '}
              {new Date(content.updated_at).toLocaleString('en-US')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
