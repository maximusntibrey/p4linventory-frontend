import { Home } from 'lucide-react';
import { LinkButton, PageHeader } from '../components/ui';

export function Forbidden() {
  return (
    <div className="flex flex-col items-start gap-4">
      <PageHeader title="403: Not allowed" subtitle="" />
      <LinkButton to="/" icon={Home}>
        Back to Home
      </LinkButton>
    </div>
  );
}
