import { useState } from 'react';
import type { FormEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Rows3 } from '../icons';
import { Field } from '../Field';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { SelectField } from './SelectField';
import { useCompact } from './useCompact';

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
  const compact = useCompact();
  const [rowsOpen, setRowsOpen] = useState(false);
  const go = (n: number) => onPageChange(Math.min(pageCount, Math.max(1, n)));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number.parseInt(goTo, 10);
    if (Number.isFinite(n)) go(n);
    setGoTo('');
  };
  const sizeSelect = pageSize !== undefined && onPageSizeChange && (
    <SelectField
      label="Rows per page"
      value={pageSize}
      onChange={(e) => onPageSizeChange(Number(e.target.value))}
    >
      {pageSizeOptions.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </SelectField>
  );

  // Phones: previous, a page indicator and next; rows per page sits in a drawer.
  if (compact) {
    return (
      <Stack
        component="nav"
        aria-label="Pagination"
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
      >
        <Button
          variant="secondary"
          icon={ChevronLeft}
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          Previous
        </Button>
        <Typography aria-current="page" variant="subtitle1" component="span">
          Page {page} of {pageCount}
        </Typography>
        <Button
          variant="secondary"
          icon={ChevronRight}
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
        >
          Next
        </Button>
        {sizeSelect && (
          <>
            <Button variant="ghost" icon={Rows3} onClick={() => setRowsOpen(true)}>
              Rows
            </Button>
            <Drawer open={rowsOpen} onClose={() => setRowsOpen(false)} title="Rows per page">
              {sizeSelect}
            </Drawer>
          </>
        )}
      </Stack>
    );
  }
  return (
    <Stack
      component="nav"
      aria-label="Pagination"
      direction="row"
      sx={{ flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5 }}
    >
      {sizeSelect && <Box sx={{ width: 144 }}>{sizeSelect}</Box>}
      <Stack
        component="ul"
        direction="row"
        sx={{ m: 0, p: 0, listStyle: 'none', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}
      >
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
            <Box
              component="li"
              key={`gap-${i}`}
              aria-hidden="true"
              sx={{ px: 0.5, color: 'text.secondary' }}
            >
              …
            </Box>
          ) : (
            <li key={n}>
              <Button
                size="sm"
                variant={n === page ? 'primary' : 'secondary'}
                aria-label={`Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => go(n)}
              >
                {n}
              </Button>
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
      </Stack>
      <Stack
        component="form"
        direction="row"
        onSubmit={submit}
        sx={{ alignItems: 'flex-end', gap: 1 }}
      >
        <Box sx={{ width: 96 }}>
          <Field
            label="Go to page"
            type="number"
            inputMode="numeric"
            min={1}
            max={pageCount}
            value={goTo}
            onChange={(e) => setGoTo(e.target.value)}
          />
        </Box>
        <Button type="submit" variant="secondary">
          Go
        </Button>
      </Stack>
    </Stack>
  );
}
