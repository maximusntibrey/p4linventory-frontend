import { ArrowLeftRight, Bell, KeyRound, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { Button } from './Button';

export type ProfilePanelProps = {
  user: { name: string; loginId: string; role: string; location?: string; src?: string };
  /** Working branch: the name to show, `onSwitch` only when the caller allows switching, `extra` for other controls (Super Admin's branch filter). */
  branch: { name: string; onSwitch?: () => void; extra?: ReactNode };
  /** Why there is nothing to show, for example "No notifications yet". */
  notificationsText: string;
  onChangePassword: () => void;
  onLogout: () => void;
  loggingOut?: boolean;
  /** Log-out failure message. */
  error?: string;
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section aria-label={title} className="flex flex-col gap-2 border-t border-line pt-3">
    <h3 className="m-0 text-sm font-semibold text-muted uppercase">{title}</h3>
    {children}
  </section>
);

/** The signed-in user's profile: who they are, working branch, security and notifications. It decides nothing; the caller passes what is allowed. Put it in a Drawer. */
export function ProfilePanel({
  user,
  branch,
  notificationsText,
  onChangePassword,
  onLogout,
  loggingOut,
  error,
}: ProfilePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Profile" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.src} size="lg" decorative />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{user.name}</span>
            <span className="text-sm text-muted">{user.role}</span>
          </div>
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted">Login ID</dt>
          <dd className="m-0 min-w-0 break-words">{user.loginId}</dd>
          <dt className="text-muted">Role</dt>
          <dd className="m-0">{user.role}</dd>
          {user.location !== undefined && (
            <>
              <dt className="text-muted">Permanent location</dt>
              <dd className="m-0 min-w-0 break-words">{user.location}</dd>
            </>
          )}
        </dl>
      </section>
      <Section title="Working branch">
        <p className="m-0 font-semibold">{branch.name}</p>
        {branch.extra}
        {branch.onSwitch && (
          <Button variant="secondary" icon={ArrowLeftRight} onClick={branch.onSwitch}>
            Switch working branch
          </Button>
        )}
      </Section>
      <Section title="Security">
        {error && (
          <p role="alert" className="m-0 font-semibold text-bad">
            {error}
          </p>
        )}
        <Button variant="secondary" icon={KeyRound} onClick={onChangePassword}>
          Change password
        </Button>
        <Button variant="secondary" icon={LogOut} onClick={onLogout} disabled={loggingOut}>
          Log out
        </Button>
      </Section>
      <Section title="Notifications">
        <p className="m-0 flex items-center gap-2 text-muted">
          <Bell aria-hidden="true" size={18} />
          <span>{notificationsText}</span>
        </p>
      </Section>
    </div>
  );
}
