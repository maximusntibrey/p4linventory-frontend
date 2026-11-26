import type { ReactNode } from 'react';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Buttons at the right (wrap under the title on phones). */
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-display">{title}</h1>
        {subtitle && <p className="m-0 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
