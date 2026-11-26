import { Home } from 'lucide-react';
import { LinkButton, PageHeader } from '../components/ui';

export function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <PageHeader
        title="Page not found"
        subtitle="We could not find that page. Check the address or go back home."
      />
      <LinkButton to="/" icon={Home}>
        Back to Home
      </LinkButton>
    </div>
  );
}
