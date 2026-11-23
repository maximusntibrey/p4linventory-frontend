import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useCurrentMe } from '../auth/guards';
import { useLogout } from '../auth/session';
import { iconForMenuKey } from './menuIcons';
import { Nav } from './Nav';
import { TopBar } from './TopBar';

/** At most 5 entries per role (FE doc s3). The server sends the list; we only draw it. */
const MAX_MENU = 5;

export function AppShell() {
  const me = useCurrentMe();
  const navigate = useNavigate();
  const out = useLogout(() => navigate('/login', { replace: true }));
  const items = me.menu.slice(0, MAX_MENU).map((m) => ({
    to: m.path,
    label: m.label,
    icon: iconForMenuKey(m.key),
  }));
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        branchName={me.working_branch?.name ?? 'No branch selected'}
        userId={me.user.login_id}
        onLogout={out.pending ? undefined : out.logout}
      >
        <Link
          to="/account/password"
          className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent underline"
        >
          Change password
        </Link>
      </TopBar>
      {out.error && (
        <p role="alert" className="m-0 px-4 pt-2 font-semibold text-bad">
          {out.error}
        </p>
      )}
      <div className="flex flex-1 flex-col md:flex-row">
        <Nav items={items} />
        <main className="min-w-0 flex-1 p-4 pb-24 md:pb-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
