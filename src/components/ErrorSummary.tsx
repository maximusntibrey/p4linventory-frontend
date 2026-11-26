import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
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
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-bad bg-bad-bg p-3 text-bad"
    >
      <p className="m-0 flex items-start gap-2 font-semibold">
        <AlertCircle aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
        <span>{title}</span>
      </p>
      {items.length > 0 && (
        <ul className="m-0 mt-1 list-disc pl-10 text-sm">
          {items.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
