import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { AlertCircle } from 'components/icons';
import { ApiError } from '../api';

export type ErrorParts = { title: string; items: string[] };

function waitText(seconds?: number): string {
  if (!seconds) return 'a little while';
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** Plain-language pieces for the summary, taken from the API's error body. Field messages are listed so the summary stands alone. */
export function describeError(e: unknown): ErrorParts {
  if (!(e instanceof ApiError)) return { title: 'Something went wrong. Try again.', items: [] };
  if (e.kind === 'rate_limited') {
    return {
      title: `Too many attempts. Wait ${waitText(e.retryAfter)}, then try again.`,
      items: [],
    };
  }
  return { title: e.message, items: e.errors.map((x) => x.message) };
}

/** Moves keyboard and screen-reader focus to itself when it appears. Remount it (change `key`) to announce a new failure. */
export function ErrorSummary({ title, items }: ErrorParts) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <Box
      ref={ref}
      role="alert"
      tabIndex={-1}
      sx={{
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'error.main',
        bgcolor: 'error.lighter',
        p: 1.5,
        color: 'error.main',
      }}
    >
      <Box
        component="p"
        sx={{ m: 0, display: 'flex', alignItems: 'flex-start', gap: 1, fontWeight: 600 }}
      >
        <AlertCircle aria-hidden="true" size={20} />
        <span>{title}</span>
      </Box>
      {items.length > 0 && (
        <Box component="ul" sx={{ m: 0, mt: 0.5, listStyle: 'disc', pl: 5, fontSize: '0.875rem' }}>
          {items.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </Box>
      )}
    </Box>
  );
}
