import { Navigate } from 'react-router-dom';
import { useCurrentMe } from '../auth/guards';
import { Dashboard } from '../features/dashboard/Dashboard';

/**
 * Home: the role-aware dashboard. A user the server gives no dashboard (the central warehouse role)
 * lands on the first screen of their own menu instead, never on a forbidden or empty page.
 */
export function Home() {
  const me = useCurrentMe();
  if (!me.permissions.includes('dashboard.view')) {
    const first = me.menu.find((m) => m.path !== '/');
    if (first) return <Navigate to={first.path} replace />;
  }
  return <Dashboard />;
}
