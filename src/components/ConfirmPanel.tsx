import { useEffect, useId, useRef } from 'react';
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
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-lg border border-bad bg-bad-bg p-3"
    >
      <p id={id} className="m-0 font-semibold text-ink">
        {title}
      </p>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending}>
          {pending ? 'Working…' : confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
