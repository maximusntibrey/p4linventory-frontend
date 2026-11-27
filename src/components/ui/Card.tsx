import type { ReactNode } from 'react';
import type { SxProps } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import MainCard from 'components/MainCard';

/** The Mantis card: a bordered white surface. Children stack in a column; pass sx for the inner layout. */
export function Card({
  children,
  sx,
  ...rest
}: { children?: ReactNode; sx?: SxProps } & Record<string, unknown>) {
  return (
    <MainCard {...rest}>
      <Stack sx={{ gap: 2, ...sx }}>{children}</Stack>
    </MainCard>
  );
}
