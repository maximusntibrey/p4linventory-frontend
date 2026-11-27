import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Columns3, Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { cx } from './cx';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';
import type { PaginationProps } from './Pagination';
import { Skeleton } from './Skeleton';

export type Column<Row> = {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Value used for sorting; setting it makes the column sortable. */
  sortValue?: (row: Row) => string | number;
  align?: 'left' | 'right';
};

export type SortState = { id: string; direction: 'asc' | 'desc' } | null;

export type DataTableProps<Row> = {
  /** Names the table for assistive tech. */
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Text used in "Select <name>" for each row checkbox. */
  rowLabel?: (row: Row) => string;
  /** Column ids to show; omit for all. Pair with ColumnVisibilityMenu. */
  visibleColumns?: string[];
  state?: 'ready' | 'loading' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
  empty?: ReactNode;
  /** Row selection: pass both. */
  selected?: ReadonlySet<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Sort controlled by the caller (server-side sort). Omit for client-side sort of the given rows. */
  sort?: SortState;
  onSortChange?: (next: SortState) => void;
  pagination?: PaginationProps;
  /** Header sticks while the body scrolls (max height 70 vh). Default true. */
  stickyHeader?: boolean;
};

const SKELETON_ROWS = 5;

export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  rowLabel,
  visibleColumns,
  state = 'ready',
  errorMessage = 'Could not load the data.',
  onRetry,
  empty,
  selected,
  onSelectedChange,
  sort: sortProp,
  onSortChange,
  pagination,
  stickyHeader = true,
}: DataTableProps<Row>) {
  const [innerSort, setInnerSort] = useState<SortState>(null);
  const controlled = onSortChange !== undefined;
  const sort = controlled ? (sortProp ?? null) : innerSort;
  const cols = columns.filter((c) => !visibleColumns || visibleColumns.includes(c.id));
  const selectable = selected !== undefined && onSelectedChange !== undefined;

  const shown = useMemo(() => {
    const col = controlled ? undefined : columns.find((c) => c.id === sort?.id);
    if (!col?.sortValue || !sort) return rows;
    const get = col.sortValue;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const [x, y] = [get(a), get(b)];
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [rows, columns, sort, controlled]);

  const cycle = (id: string) => {
    const next: SortState =
      sort?.id !== id
        ? { id, direction: 'asc' }
        : sort.direction === 'asc'
          ? { id, direction: 'desc' }
          : null;
    setInnerSort(next);
    onSortChange?.(next);
  };

  const keys = shown.map(rowKey);
  const allOn = keys.length > 0 && keys.every((k) => selected?.has(k));
  const someOn = !allOn && keys.some((k) => selected?.has(k));
  const toggleAll = () => {
    const next = new Set(selected);
    keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
    onSelectedChange?.(next);
  };
  const toggle = (k: string) => {
    const next = new Set(selected);
    if (!next.delete(k)) next.add(k);
    onSelectedChange?.(next);
  };

  const colSpan = cols.length + (selectable ? 1 : 0);
  let body: ReactNode;
  if (state === 'error') {
    body = (
      <tr>
        <td colSpan={colSpan} className="p-6">
          <div role="alert" className="flex flex-col items-center gap-3 text-center">
            <AlertCircle aria-hidden="true" size={28} className="text-bad" />
            <p className="m-0 font-semibold text-bad">{errorMessage}</p>
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  } else if (state === 'loading') {
    body = Array.from({ length: SKELETON_ROWS }, (_, i) => (
      <tr key={i}>
        {Array.from({ length: colSpan }, (_, j) => (
          <td key={j} className="p-(--density-cell)">
            <Skeleton />
          </td>
        ))}
      </tr>
    ));
  } else if (shown.length === 0) {
    body = (
      <tr>
        <td colSpan={colSpan} className="p-4">
          {empty ?? (
            <EmptyState icon={Inbox} title="Nothing to show" description="No rows match." />
          )}
        </td>
      </tr>
    );
  } else {
    body = shown.map((row) => {
      const k = rowKey(row);
      const on = selected?.has(k) ?? false;
      return (
        <tr
          key={k}
          aria-selected={selectable ? on : undefined}
          className={cx(
            'border-t border-line',
            on && 'bg-primary-soft shadow-[inset_4px_0_0_var(--color-primary)]',
          )}
        >
          {selectable && (
            <td className="w-12 px-3">
              <Checkbox
                label={`Select ${rowLabel?.(row) ?? k}`}
                checked={on}
                onChange={() => toggle(k)}
                className="[&>span]:sr-only"
              />
            </td>
          )}
          {cols.map((c) => (
            <td
              key={c.id}
              className={cx('p-(--density-cell) align-middle', c.align === 'right' && 'text-right')}
            >
              {c.cell(row)}
            </td>
          ))}
        </tr>
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cx(
          'overflow-auto rounded-lg border border-line bg-canvas',
          stickyHeader && 'max-h-[70vh]',
        )}
        // Scrollable region must be focusable so keyboard users can scroll it (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label={`${caption} (scrollable)`}
      >
        <table
          aria-busy={state === 'loading' || undefined}
          className="w-full min-w-max border-collapse text-left"
        >
          <caption className="sr-only">{caption}</caption>
          <thead className={cx('bg-surface', stickyHeader && 'sticky top-0 z-(--z-sticky)')}>
            <tr>
              {selectable && (
                <th scope="col" className="w-12 px-3">
                  <Checkbox
                    label="Select all rows"
                    checked={allOn}
                    indeterminate={someOn}
                    onChange={toggleAll}
                    className="[&>span]:sr-only"
                  />
                </th>
              )}
              {cols.map((c) => {
                const dir = sort?.id === c.id ? sort.direction : null;
                const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={
                      c.sortValue
                        ? dir === 'asc'
                          ? 'ascending'
                          : dir === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    className={cx('p-0 text-sm font-semibold', c.align === 'right' && 'text-right')}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => cycle(c.id)}
                        className="inline-flex min-h-target w-full items-center gap-1 px-(--density-cell) font-semibold"
                      >
                        <span>{c.header}</span>
                        <Icon aria-hidden="true" size={14} />
                      </button>
                    ) : (
                      <span className="block p-(--density-cell)">{c.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {pagination && state === 'ready' && <Pagination {...pagination} />}
    </div>
  );
}

/** Avatar + name (+ secondary line) for the first column. */
export function AvatarCell({
  name,
  subtitle,
  src,
}: {
  name: string;
  subtitle?: string;
  src?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <Avatar name={name} src={src} decorative size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold">{name}</span>
        {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
      </span>
    </span>
  );
}

/** Menu of checkboxes that shows or hides columns. Lives in the Toolbar's children slot. */
export function ColumnVisibilityMenu({
  columns,
  visible,
  onChange,
}: {
  columns: { id: string; header: string }[];
  visible: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <details className="relative">
      <summary className="inline-flex min-h-target cursor-pointer list-none items-center gap-2 rounded-md border border-control bg-canvas px-4 font-semibold">
        <Columns3 aria-hidden="true" size={20} />
        <span>Columns</span>
      </summary>
      <fieldset className="absolute right-0 z-(--z-overlay) m-0 mt-1 min-w-48 rounded-lg border border-line bg-canvas p-3 shadow-pop">
        <legend className="sr-only">Visible columns</legend>
        {columns.map((c) => (
          <Checkbox
            key={c.id}
            label={c.header}
            checked={visible.includes(c.id)}
            onChange={(e) =>
              onChange(e.target.checked ? [...visible, c.id] : visible.filter((v) => v !== c.id))
            }
          />
        ))}
      </fieldset>
    </details>
  );
}
