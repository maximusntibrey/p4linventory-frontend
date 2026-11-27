import { Navigate } from 'react-router-dom';
import { useCurrentMe } from '../auth/guards';
import { Dashboard } from '../features/dashboard/Dashboard';

/** Home: the role-aware dashboard. A menu without Home (for example Front Staff) opens on its first entry instead. */
export function Home() {
  const me = useCurrentMe();
  const first = me.menu[0];
  const redirect = first && !me.menu.some((m) => m.path === '/') ? first.path : undefined;
  if (redirect) return <Navigate to={redirect} replace />;
  return <Dashboard />;
}
