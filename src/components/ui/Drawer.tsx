import { useId } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MuiDrawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/** A bottom sheet for phones (filters, actions, rows per page). MUI handles the focus trap, Escape and focus return. */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <MuiDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      transitionDuration={0}
      slotProps={{
        paper: {
          'aria-labelledby': id,
          role: 'dialog',
          sx: {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            maxHeight: '85vh',
            bgcolor: 'background.paper',
            color: 'text.primary',
          },
        },
      }}
    >
      <Stack sx={{ p: 2, gap: 2 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Typography id={id} variant="h4" component="h2">
            {title}
          </Typography>
          <Button variant="outlined" color="secondary" onClick={onClose}>
            Close
          </Button>
        </Box>
        {children}
      </Stack>
    </MuiDrawer>
  );
}
