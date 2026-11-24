import { describeError, ErrorSummary } from './ErrorSummary';

/** Shows what the API rejected, in plain words, and moves focus to it. `at` changes on every new attempt so a repeat failure is announced again. */
export function ApiProblem({ error, at }: { error: unknown; at?: number }) {
  if (!error) return null;
  const parts = describeError(error);
  return <ErrorSummary key={at} title={parts.title} items={parts.items} />;
}
