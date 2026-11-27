import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MainCard from 'components/MainCard';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../../api';

/** What a card shows instead of numbers when the data is not here: loading, failed, or not built on the backend yet. */
export type CardState = 'loading' | 'error' | 'planned' | 'ready';

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

export const NOT_AVAILABLE = 'Not available yet';

export const stateOf = (q: Pick<UseQueryResult, 'isPending' | 'isError'>): CardState =>
  q.isPending ? 'loading' : q.isError ? 'error' : 'ready';

const errorText = (q?: Pick<UseQueryResult, 'error'>) =>
  q?.error instanceof ApiError && q.error.kind === 'forbidden'
    ? 'Not allowed for your account.'
    : 'Could not load. Try again.';

type BodyProps = {
  state: CardState;
  query?: Pick<UseQueryResult, 'error' | 'refetch'>;
  /** Why a planned card is empty: the backend data it needs. */
  need?: string;
  empty?: string;
  children?: ReactNode;
  lines?: number;
};

/** Loading skeleton, error with retry, "Not available yet" without fake numbers, or the content. */
export function CardBody({ state, query, need, empty, children, lines = 2 }: BodyProps) {
  if (state === 'loading')
    return (
      <Stack role="status" aria-busy="true" sx={{ gap: 0.5 }}>
        <Box component="span" sx={visuallyHidden}>
          Loading
        </Box>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} variant="text" width={i === 0 ? '60%' : '40%'} />
        ))}
      </Stack>
    );
  if (state === 'error')
    return (
      <Stack role="alert" sx={{ gap: 0.5, alignItems: 'flex-start' }}>
        <Typography variant="body2" color="error.main">
          {errorText(query)}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => void query?.refetch()}>
          Try again
        </Button>
      </Stack>
    );
  if (state === 'planned')
    return (
      <Stack sx={{ gap: 0.25 }}>
        <Typography variant="subtitle1" component="p" color="text.secondary">
          {NOT_AVAILABLE}
        </Typography>
        {need && (
          <Typography variant="caption" color="text.secondary">
            Coming soon. Needs: {need}
          </Typography>
        )}
      </Stack>
    );
  if (empty)
    return (
      <Typography variant="body2" color="text.secondary">
        {empty}
      </Typography>
    );
  return <>{children}</>;
}

type StatProps = BodyProps & {
  title: string;
  value: ReactNode;
  caption?: ReactNode;
  to?: string;
  linkLabel?: string;
};

/** Mantis stat card (MainCard, small title, big number in the display face). No trend chip: there is no prior-period data. */
export function StatCard({ title, value, caption, to, linkLabel, ...body }: StatProps) {
  return (
    <MainCard contentSX={{ p: 2.25 }} sx={{ height: '100%' }}>
      <Stack sx={{ gap: 0.5 }}>
        <Typography variant="h6" component="h2" sx={{ color: 'text.secondary' }}>
          {title}
        </Typography>
        <CardBody {...body}>
          <Typography variant="h4" component="p" sx={{ color: 'text.primary' }}>
            {value}
          </Typography>
          {caption && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {caption}
            </Typography>
          )}
        </CardBody>
        {to && body.state === 'ready' && (
          <Button
            component={RouterLink}
            to={to}
            size="small"
            sx={{ alignSelf: 'flex-start', ml: -1 }}
          >
            {linkLabel ?? 'View'}
          </Button>
        )}
      </Stack>
    </MainCard>
  );
}

type PanelProps = BodyProps & { title: string; action?: { to: string; label: string } };

/** Mantis chart or list card: MainCard with a title and an optional "View all" link. */
export function PanelCard({ title, action, children, ...body }: PanelProps) {
  return (
    <MainCard
      title={title}
      secondary={
        action && body.state === 'ready' ? (
          <Button component={RouterLink} to={action.to} size="small">
            {action.label}
          </Button>
        ) : undefined
      }
      sx={{ height: '100%' }}
    >
      <CardBody lines={4} {...body}>
        {children}
      </CardBody>
    </MainCard>
  );
}
