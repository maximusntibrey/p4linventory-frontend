import { EmptyState, PageHeader } from '../components/ui';
import { Construction } from 'lucide-react';

/** Stand-in for a screen that a later step builds. The route and its permission check are real. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Not built yet"
        description="This screen is not built yet."
      />
    </div>
  );
}
