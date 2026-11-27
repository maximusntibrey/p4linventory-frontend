import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from '../icons';
import type { IconType } from '../icons';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const tones: Record<
  Tone,
  { color: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: IconType }
> = {
  success: { color: 'success', icon: CheckCircle2 },
  warning: { color: 'warning', icon: AlertTriangle },
  danger: { color: 'error', icon: AlertCircle },
  info: { color: 'info', icon: Info },
  neutral: { color: 'default', icon: Info },
};

export type StatusBadgeProps = {
  tone?: Tone;
  variant?: 'soft' | 'outline';
  /** Override the tone icon. Status is always icon plus text, never colour alone. */
  icon?: IconType;
  children: ReactNode;
};

/** Soft status chip (the Mantis light chip). Orange is never a status colour. */
export function StatusBadge({
  tone = 'neutral',
  variant = 'soft',
  icon,
  children,
}: StatusBadgeProps) {
  const { color, icon: Default } = tones[tone];
  const Icon = icon ?? Default;
  return (
    <Chip
      size="small"
      variant={variant === 'soft' ? 'light' : 'outlined'}
      color={color}
      icon={<Icon size={16} />}
      label={children}
    />
  );
}
