import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from './Button';
import { cx } from './cx';
import { FormField } from './FormField';
import { Input } from './Input';
import { Select } from './Select';

export type PaginationProps = {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
};

/** Page numbers to draw: first, last, and a window around the current page; null = gap. */
export function pageWindow(page: number, count: number): (number | null)[] {
  const keep = new Set([1, count, page - 1, page, page + 1].filter((n) => n >= 1 && n <= count));
  const out: (number | null)[] = [];
  [...keep]
    .sort((a, b) => a - b)
    .forEach((n, i, all) => {
      if (i > 0 && n - all[i - 1] > 1) out.push(null);
      out.push(n);
    });
  return out;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
}: PaginationProps) {
  const [goTo, setGoTo] = useState('');
  const go = (n: number) => onPageChange(Math.min(pageCount, Math.max(1, n)));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number.parseInt(goTo, 10);
    if (Number.isFinite(n)) go(n);
    setGoTo('');
  };
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-end justify-between gap-3">
      {pageSize !== undefined && onPageSizeChange && (
        <div className="w-36">
          <FormField label="Rows per page">
            {(c) => (
              <Select
                {...c}
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
      )}
      <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        <li>
          <Button
            size="sm"
            variant="ghost"
            icon={ChevronsLeft}
            disabled={page <= 1}
            onClick={() => go(1)}
          >
            First
          </Button>
        </li>
        <li>
          <Button
            size="sm"
            variant="ghost"
            icon={ChevronLeft}
            disabled={page <= 1}
            onClick={() => go(page - 1)}
          >
            Previous
          </Button>
        </li>
        {pageWindow(page, pageCount).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                aria-label={`Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => go(n)}
                className={cx(
                  'min-h-target min-w-target rounded-md border px-2 font-semibold',
                  n === page
                    ? 'border-transparent bg-primary-solid text-on-primary'
                    : 'border-line bg-canvas text-ink hover:bg-surface',
                )}
              >
                {n}
              </button>
            </li>
          ),
        )}
        <li>
          <Button
            size="sm"
            variant="ghost"
            icon={ChevronRight}
            disabled={page >= pageCount}
            onClick={() => go(page + 1)}
          >
            Next
          </Button>
        </li>
        <li>
          <Button
            size="sm"
            variant="ghost"
            icon={ChevronsRight}
            disabled={page >= pageCount}
            onClick={() => go(pageCount)}
          >
            Last
          </Button>
        </li>
      </ul>
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="w-24">
          <FormField label="Go to page">
            {(c) => (
              <Input
                {...c}
                type="number"
                inputMode="numeric"
                min={1}
                max={pageCount}
                value={goTo}
                onChange={(e) => setGoTo(e.target.value)}
              />
            )}
          </FormField>
        </div>
        <Button type="submit" variant="secondary">
          Go
        </Button>
      </form>
    </nav>
  );
}
