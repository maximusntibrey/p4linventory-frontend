import { AlertCircle, AlertTriangle, CheckCircle2, Circle, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

const tones: Record<Tone, { soft: string; outline: string; icon: LucideIcon }> = {
  success: {
    soft: 'bg-ok-bg text-ok border-transparent',
    outline: 'bg-canvas text-ok border-ok',
    icon: CheckCircle2,
  },
  warning: {
    soft: 'bg-warn-bg text-warn border-transparent',
    outline: 'bg-canvas text-warn border-warn',
    icon: AlertTriangle,
  },
  danger: {
    soft: 'bg-bad-bg text-bad border-transparent',
    outline: 'bg-canvas text-bad border-bad',
    icon: AlertCircle,
  },
  info: {
    soft: 'bg-info-bg text-info border-transparent',
    outline: 'bg-canvas text-info border-info',
    icon: Info,
  },
  neutral: {
    soft: 'bg-surface text-ink border-transparent',
    outline: 'bg-canvas text-ink border-control',
    icon: Circle,
  },
  brand: {
    soft: 'bg-primary-soft-strong text-primary-solid-hover border-transparent',
    outline: 'bg-canvas text-primary-solid border-primary-line',
    icon: Circle,
  },
};

export type StatusBadgeProps = {
  tone?: Tone;
  variant?: 'soft' | 'outline';
  /** Override the tone's default icon. Status is always icon plus text, never colour alone. */
  icon?: LucideIcon;
  children: ReactNode;
};

export function StatusBadge({
  tone = 'neutral',
  variant = 'soft',
  icon,
  children,
}: StatusBadgeProps) {
  const Icon = icon ?? tones[tone].icon;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-pill border px-2 py-1 text-sm font-semibold',
        tones[tone][variant],
      )}
    >
      <Icon aria-hidden="true" size={16} />
      <span>{children}</span>
    </span>
  );
}
