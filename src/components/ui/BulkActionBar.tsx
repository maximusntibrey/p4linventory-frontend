import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export type BulkActionBarProps = {
  count: number;
  onClear: () => void;
  /** The actions the API allows for the selection, usually Buttons. */
  children?: ReactNode;
};

/** Floating bar, bottom center. Draws nothing when nothing is selected. Selection count is announced politely. */
export function BulkActionBar({ count, onClear, children }: BulkActionBarProps) {
  if (count < 1) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="fixed inset-x-2 bottom-20 z-(--z-nav) mx-auto flex max-w-fit flex-wrap items-center justify-center gap-2 rounded-xl bg-ink p-2 text-on-primary shadow-float md:bottom-6"
    >
      <p role="status" className="m-0 px-2 font-semibold">
        {count} Selected
      </p>
      {children}
      <Button
        variant="ghost"
        icon={X}
        onClick={onClear}
        className="text-on-primary hover:bg-neutral-700"
      >
        Clear
      </Button>
    </div>
  );
}
