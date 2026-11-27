import { AlertCircle } from 'lucide-react';
import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Shown under the label in the `cards` variant. */
  description?: string;
};

export type SegmentedControlProps<T extends string> = {
  /** Accessible name of the group. */
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** `segments` = compact joined buttons, `cards` = radio cards with icon and description. */
  variant?: 'segments' | 'cards';
  /** Visible label above the group (form use). Without it the group is named by `label` only. */
  legend?: string;
  required?: boolean;
  /** Plain-language message from the API or the form, shown under the group. */
  error?: string;
};

/** Native radios underneath: arrow keys, one tab stop and form semantics come for free. */
export function SegmentedControl<T extends string>({
  label,
  value,
  onValueChange,
  options,
  variant = 'segments',
  legend,
  required,
  error,
}: SegmentedControlProps<T>) {
  const name = useId();
  const cards = variant === 'cards';
  const errorId = `${name}-error`;
  const group = (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      aria-required={required || undefined}
      className={cx(
        cards
          ? 'grid gap-2 sm:grid-cols-2'
          : 'inline-flex flex-wrap gap-1 rounded-lg bg-surface p-1',
      )}
    >
      {options.map(({ value: v, label: text, icon: Icon, description }) => (
        <label
          key={v}
          className={cx(
            'relative flex min-h-target cursor-pointer items-center gap-2 rounded-md px-3 py-2 font-semibold has-focus-visible:outline-3 has-focus-visible:outline-primary-line',
            cards
              ? 'items-start border border-control bg-canvas has-checked:border-primary-solid has-checked:bg-primary-soft'
              : 'has-checked:bg-canvas has-checked:text-primary-solid has-checked:shadow-card',
          )}
        >
          <input
            type="radio"
            name={name}
            value={v}
            checked={v === value}
            onChange={() => onValueChange(v)}
            className="sr-only"
          />
          {Icon && <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0" />}
          <span className="flex flex-col">
            <span>{text}</span>
            {cards && description && (
              <span className="text-sm font-normal text-muted">{description}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
  if (!legend && !error) return group;
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      {legend && (
        <legend className="mb-1 p-0 font-semibold">
          {legend}
          {required && <span className="text-bad"> (required)</span>}
        </legend>
      )}
      {group}
      {error && (
        <p id={errorId} className="m-0 flex items-center gap-1 text-sm font-semibold text-bad">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
