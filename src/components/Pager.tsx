import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui';

type Props = {
  page: { page: number; next: string | null; previous: string | null };
  onPage: (n: number) => void;
};

/** Previous / Next from the API's page envelope. Nothing is drawn for a single page. */
export function Pager({ page, onPage }: Props) {
  if (!page.next && !page.previous) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-2">
      <Button
        variant="secondary"
        icon={ChevronLeft}
        disabled={!page.previous}
        onClick={() => onPage(page.page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-muted">Page {page.page}</span>
      <Button
        variant="secondary"
        icon={ChevronRight}
        disabled={!page.next}
        onClick={() => onPage(page.page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
