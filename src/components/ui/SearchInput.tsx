import { Search } from 'lucide-react';
import type { InputHTMLAttributes, Ref } from 'react';
import { controlClass } from './Input';
import { cx } from './cx';

export type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'aria-label'
> & {
  /** Accessible name (also the placeholder when none is given). */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Keyboard hint shown at the right, for example "⌘K". */
  shortcutHint?: string;
  ref?: Ref<HTMLInputElement>;
};

export function SearchInput({
  label,
  value,
  onValueChange,
  shortcutHint,
  placeholder,
  className,
  ref,
  ...rest
}: SearchInputProps) {
  return (
    <div className={cx('relative flex items-center', className)}>
      <Search
        aria-hidden="true"
        size={18}
        className="pointer-events-none absolute left-3 text-muted"
      />
      <input
        {...rest}
        ref={ref}
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cx(controlClass, 'border-control pl-10', shortcutHint && 'pr-14')}
      />
      {shortcutHint && !value && (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-3 rounded-sm border border-line bg-surface px-1.5 py-0.5 text-xs font-semibold text-muted"
        >
          {shortcutHint}
        </kbd>
      )}
    </div>
  );
}
