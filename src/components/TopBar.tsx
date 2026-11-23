import { ArrowLeftRight, LogOut } from 'lucide-react';
import { Button } from './Button';

type Props = {
  branchName: string;
  userId: string;
  onSwitchBranch?: () => void;
  onLogout?: () => void;
};

export function TopBar({ branchName, userId, onSwitchBranch, onLogout }: Props) {
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
        <div className="flex gap-2">
          {/* Disabled until F2 wires the real actions. */}
          <Button
            variant="secondary"
            icon={ArrowLeftRight}
            onClick={onSwitchBranch}
            disabled={!onSwitchBranch}
          >
            Switch branch
          </Button>
          <Button variant="secondary" icon={LogOut} onClick={onLogout} disabled={!onLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
