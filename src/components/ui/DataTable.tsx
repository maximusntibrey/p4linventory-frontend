import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Inbox } from '../icons';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';
import type { PaginationProps } from './Pagination';

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
  /** Text used in "Select name" for each row checkbox. */
  rowLabel?: (row: Row) => string;
  /** Column ids to show; omit for all. */
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
// On phones each cell shows its column name. It is a real element hidden from assistive tech, so cell names stay clean.
const cardLabel = {
  display: { xs: 'inline', md: 'none' },
  fontWeight: 600,
  color: 'text.secondary',
  textAlign: 'left',
  justifySelf: 'start',
} as const;
const ariaSort = { asc: 'ascending', desc: 'descending' } as const;

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
      <TableRow>
        <TableCell colSpan={colSpan} sx={{ p: 3 }}>
          <Stack role="alert" sx={{ alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
            <Box sx={{ color: 'error.main', display: 'flex' }}>
              <AlertCircle size={28} />
            </Box>
            <Typography variant="subtitle1" component="p" color="error.main">
              {errorMessage}
            </Typography>
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            )}
          </Stack>
        </TableCell>
      </TableRow>
    );
  } else if (state === 'loading') {
    body = Array.from({ length: SKELETON_ROWS }, (_, i) => (
      <TableRow key={i}>
        {Array.from({ length: colSpan }, (_, j) => (
          <TableCell key={j}>
            <Skeleton aria-hidden="true" />
          </TableCell>
        ))}
      </TableRow>
    ));
  } else if (shown.length === 0) {
    body = (
      <TableRow>
        <TableCell colSpan={colSpan} sx={{ p: 3 }}>
          {empty ?? (
            <EmptyState icon={Inbox} title="Nothing to show" description="No rows match." />
          )}
        </TableCell>
      </TableRow>
    );
  } else {
    body = shown.map((row) => {
      const k = rowKey(row);
      const on = selected?.has(k) ?? false;
      return (
        <TableRow key={k} hover selected={on}>
          {selectable && (
            <TableCell padding="checkbox">
              <Checkbox
                checked={on}
                onChange={() => toggle(k)}
                slotProps={{ input: { 'aria-label': `Select ${rowLabel ? rowLabel(row) : k}` } }}
              />
            </TableCell>
          )}
          {cols.map((c) => (
            <TableCell key={c.id} align={c.align === 'right' ? 'right' : 'left'}>
              <Box component="span" aria-hidden="true" sx={cardLabel}>
                {c.header}
              </Box>
              <Box component="span" sx={{ minWidth: 0 }}>
                {c.cell(row)}
              </Box>
            </TableCell>
          ))}
        </TableRow>
      );
    });
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <TableContainer
        sx={{
          maxHeight: stickyHeader ? '70vh' : undefined,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Table
          aria-label={caption}
          stickyHeader={stickyHeader}
          aria-busy={state === 'loading' || undefined}
          sx={(theme) => ({
            // Phones and tablets: each row becomes a labelled card (the header stays for assistive tech).
            [theme.breakpoints.down('md')]: {
              '& thead': {
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
              },
              '& tbody tr': {
                display: 'block',
                borderBottom: '1px solid',
                borderColor: 'divider',
                py: 0.5,
              },
              // Two fixed columns: the label at the same x in every row, the value right-aligned and wrapping.
              '& tbody td': {
                display: 'grid',
                gridTemplateColumns: '38% minmax(0, 1fr)',
                columnGap: 2,
                alignItems: 'center',
                minHeight: 44,
                py: 0.75,
                px: 2,
                border: 0,
                textAlign: 'right',
                overflowWrap: 'anywhere',
              },
              // The theme pads the first and last cell of a row more: cards use one padding for every row.
              '& tbody tr td.MuiTableCell-root:first-of-type, & tbody tr td.MuiTableCell-root:last-of-type':
                {
                  pl: 2,
                  pr: 2,
                },
              '& tbody td > *': { margin: 0 }, // right-aligned cells push children with auto margins in the theme
              '& tbody td.MuiTableCell-paddingCheckbox': { display: 'block', textAlign: 'left' },
              '& tbody td > span:last-child': { justifySelf: 'end', textAlign: 'right' },
              '& tbody td[colspan]': { display: 'table-cell', px: 2 },
            },
          })}
        >
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allOn}
                    indeterminate={someOn}
                    onChange={toggleAll}
                    slotProps={{ input: { 'aria-label': 'Select all rows' } }}
                  />
                </TableCell>
              )}
              {cols.map((c) => {
                const active = sort?.id === c.id ? sort.direction : null;
                return (
                  <TableCell
                    key={c.id}
                    align={c.align === 'right' ? 'right' : 'left'}
                    aria-sort={c.sortValue ? (active ? ariaSort[active] : 'none') : undefined}
                  >
                    {c.sortValue ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cycle(c.id)}
                        icon={
                          active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ArrowUpDown
                        }
                      >
                        {c.header}
                      </Button>
                    ) : (
                      c.header
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>{body}</TableBody>
        </Table>
      </TableContainer>
      {pagination && <Pagination {...pagination} />}
    </Stack>
  );
}
