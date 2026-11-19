import { ArrowLeftRight, LogOut, Store, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './Button.tsx';

export interface TopBarProps {
  branchName: string;
  userId: string;
  onSwitchBranch: () => void;
  onLogout: () => void;
  /** Extra controls (for example a role switcher later), supplied by the app shell. */
  children?: ReactNode;
}

/** Branch, user ID, labelled switch-branch and logout. Presentational: all data is passed in. */
export function TopBar({ branchName, userId, onSwitchBranch, onLogout, children }: TopBarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-grey-200 bg-white px-4 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-grey-900">
        <p className="flex min-w-0 items-center gap-1 font-semibold">
          <Store aria-hidden="true" className="size-5 shrink-0" />
          <span className="sr-only">Branch: </span>
          <span className="truncate">{branchName}</span>
        </p>
        <p className="flex items-center gap-1 text-grey-700">
          <UserRound aria-hidden="true" className="size-5 shrink-0" />
          <span className="sr-only">User ID: </span>
          <span>{userId}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button variant="secondary" onClick={onSwitchBranch}>
          <ArrowLeftRight aria-hidden="true" className="size-5" />
          Switch branch
        </Button>
        <Button variant="secondary" onClick={onLogout}>
          <LogOut aria-hidden="true" className="size-5" />
          Log out
        </Button>
      </div>
    </header>
  );
}
