import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Usually one Button. */
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-canvas p-8 text-center">
      {Icon && (
        <span aria-hidden="true" className="rounded-pill bg-primary-soft p-3 text-primary-solid">
          <Icon size={28} />
        </span>
      )}
      <h2 className="text-title">{title}</h2>
      {description && <p className="m-0 max-w-prose text-muted">{description}</p>}
      {action}
    </div>
  );
}
