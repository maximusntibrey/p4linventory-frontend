import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { Search, SlidersHorizontal } from '../icons';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { useCompact } from './useCompact';

/**
 * A list's search form. Desktop: the search box, the filters and the submit button in one grid.
 * Phones: the search box stays, every other filter moves into a "Filters" drawer (Mantis mobile pattern).
 * Filters are controlled by the caller; the drawer's Apply runs the same submit.
 */
export function FilterForm({
  search,
  children,
  onSubmit,
  submitLabel = 'Search',
}: {
  /** The always-visible search field. */
  search: ReactNode;
  /** The other filter fields (SelectField, TextField, ...). */
  children?: ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  const compact = useCompact();
  const [open, setOpen] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  if (compact) {
    return (
      <Stack component="form" role="search" onSubmit={submit} sx={{ gap: 1.5 }}>
        {/* One compact row: the search field (Enter searches) and the Filters button beside it. */}
        <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-end' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>{search}</Box>
          {children && (
            <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setOpen(true)}>
              Filters
            </Button>
          )}
        </Stack>
        <Drawer open={open} onClose={() => setOpen(false)} title="Filters">
          <Stack sx={{ gap: 1.5 }}>
            {children}
            <Button
              onClick={() => {
                setOpen(false);
                onSubmit();
              }}
            >
              Apply filters
            </Button>
          </Stack>
        </Drawer>
      </Stack>
    );
  }
  return (
    <Box
      component="form"
      role="search"
      onSubmit={submit}
      sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
    >
      <Box sx={{ gridColumn: 'span 2' }}>{search}</Box>
      {children}
      <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
        <Button type="submit" variant="secondary" icon={Search} sx={{ width: '100%' }}>
          {submitLabel}
        </Button>
      </Box>
    </Box>
  );
}
