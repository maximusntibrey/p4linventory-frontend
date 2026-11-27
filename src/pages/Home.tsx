import { Navigate } from 'react-router-dom';
import { useCurrentMe } from '../auth/guards';
import { Dashboard } from '../features/dashboard/Dashboard';

/**
 * Home: the role-aware dashboard. A user the server gives no dashboard (the central warehouse role)
 * lands on the first screen of their own menu instead, never on a forbidden or empty page.
 */
export function Home() {
  const me = useCurrentMe();
  // Home has something of its own for a user with a dashboard or a sell/receive action; a read-only user has not.
  const hasHome = (['dashboard.view', 'sales.record', 'dispatches.waiting'] as const).some((p) =>
    me.permissions.includes(p),
  );
  if (!hasHome && !me.menu.some((m) => m.path === '/')) {
    const first = me.menu.find((m) => m.path !== '/');
    if (first) return <Navigate to={first.path} replace />;
  }
  return <Dashboard />;
}
