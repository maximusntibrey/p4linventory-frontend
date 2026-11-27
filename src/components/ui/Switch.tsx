import { cx } from './cx';

export type SwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** role="switch". State is shown as text (On / Off) as well as position, never by colour alone. */
export function Switch({ label, checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cx(
        'inline-flex min-h-target items-center gap-3 rounded-md text-left font-semibold disabled:opacity-50',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'flex h-6 w-11 shrink-0 items-center rounded-pill border border-control p-0.5',
          checked ? 'justify-end bg-primary-solid' : 'justify-start bg-canvas',
        )}
      >
        <span className={cx('size-4 rounded-pill', checked ? 'bg-on-primary' : 'bg-control')} />
      </span>
      <span>{label}</span>
      <span className="text-sm font-normal text-muted">{checked ? 'On' : 'Off'}</span>
    </button>
  );
}
