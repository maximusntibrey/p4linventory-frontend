import { Home } from 'lucide-react';
import { LinkButton, PageHeader } from '../components/ui';

export function Forbidden() {
  return (
    <div className="flex flex-col items-start gap-4">
      <PageHeader
        title="403: Not allowed"
        subtitle="Your account is not allowed to open this page. If you need it, ask your administrator."
      />
      <LinkButton to="/" icon={Home}>
        Back to Home
      </LinkButton>
    </div>
  );
}
