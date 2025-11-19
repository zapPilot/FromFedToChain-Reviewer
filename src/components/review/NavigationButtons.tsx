import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NavigationInfo } from '@/types/content';

interface NavigationButtonsProps {
  navigation: NavigationInfo;
}

export function NavigationButtons({ navigation }: NavigationButtonsProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        {navigation.previous ? (
          <Link href={`/review/${navigation.previous}`}>
            <Button variant="outline">← Previous</Button>
          </Link>
        ) : (
          <Button variant="outline" disabled>
            ← Previous
          </Button>
        )}
      </div>

      <Link href="/review">
        <Button variant="ghost">Skip</Button>
      </Link>

      <div>
        {navigation.next ? (
          <Link href={`/review/${navigation.next}`}>
            <Button variant="outline">Next →</Button>
          </Link>
        ) : (
          <Button variant="outline" disabled>
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
