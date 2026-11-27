import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../api';
import { Forbidden } from '../pages/Forbidden';
import { describeError } from './ErrorSummary';
import { Button, Skeleton, SkeletonText } from './ui';

type Props<T> = {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  /** Small notice instead of the full 403 page, for a block inside a page that has its own heading. */
  inline?: boolean;
};

/** Loading, "not allowed" (the API said 403), retryable error, or the data. */
export function QueryGate<T>({ query, children, inline = false }: Props<T>) {
  if (query.isPending) {
    return (
      <Box
        role="status"
        aria-busy="true"
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        <Box
          component="span"
          sx={{
            ...{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
            },
          }}
        >
          Loading…
        </Box>
        <Skeleton width="33%" height={32} />
        <SkeletonText lines={4} />
      </Box>
    );
  }
  if (query.isError) {
    const e = query.error;
    if (e instanceof ApiError && e.kind === 'forbidden') {
      return inline ? (
        <Box component="p" role="alert" sx={{ m: 0, fontWeight: 600, color: 'error.main' }}>
          Your account is not allowed to see this.
        </Box>
      ) : (
        <Forbidden />
      );
    }
    return (
      <Box
        role="alert"
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5 }}
      >
        <Box component="p" sx={{ m: 0, fontWeight: 600, color: 'error.main' }}>
          {describeError(e).title}
        </Box>
        <Button onClick={() => void query.refetch()}>Try again</Button>
      </Box>
    );
  }
  return <>{children(query.data)}</>;
}
