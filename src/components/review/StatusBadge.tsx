import { Status } from '@/types/content';
import { ContentSchema } from '@/lib/ContentSchema';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const info = ContentSchema.getStatusInfo(status);

  return (
    <Badge
      className={`${info.color} ${info.bgColor} border-0`}
      variant="secondary"
    >
      {info.name}
    </Badge>
  );
}
