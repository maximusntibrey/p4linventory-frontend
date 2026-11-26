import { ArrowLeftRight, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui';

type Props = {
  branchName: string;
  userId: string;
  onSwitchBranch?: () => void;
  onLogout?: () => void;
  /** Extra actions (for example the change-password link) shown before the buttons. */
  children?: ReactNode;
};

export function TopBar({ branchName, userId, onSwitchBranch, onLogout, children }: Props) {
  return (
    <header className="border-b border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="min-w-0">
          <p className="m-0 font-display text-2xl leading-none text-accent">Payless4Laptops</p>
          <p className="m-0 truncate text-sm text-muted">
            <span className="font-semibold text-ink">{branchName}</span>
            <span aria-hidden="true"> · </span>
            <span>{userId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {children}
          {/* Only drawn when the API allows switching (caller passes the handler). */}
          {onSwitchBranch && (
            <Button variant="secondary" icon={ArrowLeftRight} onClick={onSwitchBranch}>
              Switch branch
            </Button>
          )}
          <Button variant="secondary" icon={LogOut} onClick={onLogout} disabled={!onLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
