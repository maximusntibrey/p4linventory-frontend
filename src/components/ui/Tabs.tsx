import { useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

export type TabItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Count shown after the label. */
  count?: number;
  panel: ReactNode;
};

export type TabsProps = {
  label: string;
  tabs: TabItem[];
  /** Controlled selection; omit for uncontrolled. */
  value?: string;
  onValueChange?: (id: string) => void;
  defaultValue?: string;
};

/** Automatic activation, roving tabindex, Arrow/Home/End keys (WAI-ARIA tabs pattern). */
export function Tabs({ label, tabs, value, onValueChange, defaultValue }: TabsProps) {
  const base = useId();
  const [inner, setInner] = useState(defaultValue ?? tabs[0]?.id);
  const current = value ?? inner;
  const select = (id: string) => {
    setInner(id);
    onValueChange?.(id);
    document.getElementById(`${base}-tab-${id}`)?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === current);
    const to =
      e.key === 'ArrowRight'
        ? (i + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + tabs.length) % tabs.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? tabs.length - 1
              : -1;
    if (to < 0) return;
    e.preventDefault();
    select(tabs[to].id);
  };
  const active = tabs.find((t) => t.id === current);
  return (
    <div className="flex flex-col gap-3">
      {/* Arrow keys move between tabs; the tabs themselves hold focus (roving tabindex). */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map(({ id, label: text, icon: Icon, count }) => {
          const on = id === current;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${base}-tab-${id}`}
              aria-selected={on}
              aria-controls={`${base}-panel-${id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(id)}
              className={cx(
                'inline-flex min-h-target shrink-0 items-center gap-2 border-b-2 px-3 font-semibold',
                on
                  ? 'border-primary-solid text-primary-solid'
                  : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {Icon && <Icon aria-hidden="true" size={18} />}
              <span>{text}</span>
              {count !== undefined && (
                <span className="rounded-pill bg-surface px-2 text-sm text-ink">{count}</span>
              )}
            </button>
          );
        })}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`${base}-panel-${active.id}`}
          aria-labelledby={`${base}-tab-${active.id}`}
          tabIndex={0}
        >
          {active.panel}
        </div>
      )}
    </div>
  );
}
