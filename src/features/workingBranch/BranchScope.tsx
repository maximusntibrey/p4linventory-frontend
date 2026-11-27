import { useState } from 'react';
import Box from '@mui/material/Box';
import { useCurrentMe } from '../../auth/guards';
import { Button, Drawer, useCompact } from '../../components/ui';
import { SlidersHorizontal } from '../../components/icons';
import { BranchFilter } from './BranchFilter';

/**
 * The Super Admin's "filter by branch" lives inside the pages whose API accepts `branch` (Home, Users, Sales), never in the header.
 * Plain select by default (inside a page filter area); `compact` on Home puts it behind a Filters button on phones.
 */
export function BranchScope({ compact: collapse = false }: { compact?: boolean }) {
  const all = useCurrentMe().all_branches;
  const phone = useCompact();
  const [open, setOpen] = useState(false);
  if (!all) return null;
  if (collapse && phone)
    return (
      <>
        <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setOpen(true)}>
          Filters
        </Button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Filters">
          <BranchFilter />
        </Drawer>
      </>
    );
  return (
    <Box sx={{ minWidth: { sm: 240 } }}>
      <BranchFilter />
    </Box>
  );
}
