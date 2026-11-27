import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { IconType } from '../icons';

export type EmptyStateProps = {
  icon?: IconType;
  title: string;
  description?: string;
  /** Usually one Button. */
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Stack
      sx={{
        alignItems: 'center',
        gap: 1.5,
        textAlign: 'center',
        p: 4,
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      {Icon && (
        <Box
          aria-hidden="true"
          sx={{
            p: 1.5,
            borderRadius: '50%',
            bgcolor: 'primary.lighter',
            color: 'primary.main',
            display: 'flex',
          }}
        >
          <Icon size={28} />
        </Box>
      )}
      <Typography variant="h4" component="h2">
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ maxWidth: 480 }}>
          {description}
        </Typography>
      )}
      {action}
    </Stack>
  );
}
