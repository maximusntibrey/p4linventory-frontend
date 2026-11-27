import { Dashboard } from '../features/dashboard/Dashboard';

/** Home: the role-aware dashboard. Every signed-in user has one; each card shows only what the server permission list allows. */
export function Home() {
  return <Dashboard />;
}
