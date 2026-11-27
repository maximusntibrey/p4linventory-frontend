import { useEffect, useId, useRef } from 'react';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { useReturnFocus } from './focus';
import { Button } from './ui';

type Props = {
  title: string;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

/** The confirm step before a risky action. Takes focus when it opens; Cancel always works. */
export function ConfirmPanel({
  title,
  confirmLabel,
  danger = true,
  pending,
  onConfirm,
  onCancel,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useReturnFocus();
  useEffect(() => ref.current?.focus(), []);
  return (
    <Box
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby={id}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'error.main',
        bgcolor: 'error.lighter',
        p: 1.5,
      }}
    >
      <Box component="p" id={id} sx={{ m: 0, fontWeight: 600, color: 'text.primary' }}>
        {title}
      </Box>
      {children}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending}>
          {pending ? 'Working…' : confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
