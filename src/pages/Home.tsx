import { Navigate } from 'react-router-dom';
import { useCurrentMe } from '../auth/guards';
import { Card } from '../components/Card';

export function Home() {
  const me = useCurrentMe();
  // A menu without Home (for example Front Staff) opens on its first entry instead.
  const first = me.menu[0];
  if (first && !me.menu.some((m) => m.path === '/')) return <Navigate to={first.path} replace />;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Home</h1>
      <Card>
        <h2 className="text-2xl">Welcome, {me.user.full_name}</h2>
        <p className="text-muted">Your tasks will appear here as each screen is added.</p>
      </Card>
    </div>
  );
}
