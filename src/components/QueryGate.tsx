import type { ReactNode } from 'react';
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
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-8 w-1/3" />
        <SkeletonText lines={4} />
      </div>
    );
  }
  if (query.isError) {
    const e = query.error;
    if (e instanceof ApiError && e.kind === 'forbidden') {
      return inline ? (
        <p role="alert" className="m-0 font-semibold text-bad">
          Your account is not allowed to see this.
        </p>
      ) : (
        <Forbidden />
      );
    }
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="m-0 font-semibold text-bad">{describeError(e).title}</p>
        <Button onClick={() => void query.refetch()}>Try again</Button>
      </div>
    );
  }
  return <>{children(query.data)}</>;
}
