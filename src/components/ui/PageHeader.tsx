import { Children, Fragment, isValidElement, useState } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MoreHorizontal } from '../icons';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { useCompact } from './useCompact';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Buttons at the right. On phones two or more collapse into one "Actions" button that opens a drawer. */
  actions?: ReactNode;
};

/** Number of elements, looking through fragments (actions are usually wrapped in one). */
const countOf = (node: ReactNode): number =>
  Children.toArray(node).reduce<number>(
    (n, c) =>
      n +
      (isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment
        ? countOf(c.props.children)
        : 1),
    0,
  );

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const compact = useCompact();
  const [open, setOpen] = useState(false);
  const overflow = compact && countOf(actions) > 1;
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="h3" component="h1">
          {title}
        </Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions && !overflow && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          {actions}
        </Stack>
      )}
      {actions && overflow && (
        <>
          <Button variant="secondary" icon={MoreHorizontal} onClick={() => setOpen(true)}>
            Actions
          </Button>
          <Drawer open={open} onClose={() => setOpen(false)} title="Actions">
            {/* Any action closes the drawer, so a dialog it opens is not stacked on it. */}
            <Stack sx={{ gap: 1, '& > *': { width: '100%' } }} onClick={() => setOpen(false)}>
              {actions}
            </Stack>
          </Drawer>
        </>
      )}
    </Box>
  );
}
