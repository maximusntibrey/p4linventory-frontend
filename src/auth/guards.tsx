import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { sessionEndedKey } from '../api/queryClient';
import { Forbidden } from '../pages/Forbidden';
import { useMe } from './session';
import type { Me } from './session';
import { Button } from '../components/ui';

const MeContext = createContext<Me | null>(null);

/** The signed-in user. Only valid below RequireAuth. */
export function useCurrentMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error('useCurrentMe needs RequireAuth above it.');
  return me;
}

/**
 * Route guard. No session: sign in. One-time password not changed yet: the forced change screen is
 * the only place to go (`pending` marks that screen). The server still checks every request.
 */
export function RequireAuth({ pending = false }: { pending?: boolean }) {
  const { data: me, isPending, isError, refetch } = useMe();
  const here = useLocation();
  const qc = useQueryClient();
  if (isPending) {
    return (
      <p role="status" className="p-4 text-muted">
        Loading…
      </p>
    );
  }
  // A failed refresh keeps the cached user: the screen and what was typed stay.
  if (isError && !me) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-4">
        <p className="m-0 font-semibold text-bad">Could not reach the server.</p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }
  if (!me) {
    const reason = qc.getQueryData(sessionEndedKey) ? 'expired' : undefined;
    return <Navigate to="/login" replace state={{ from: here.pathname, reason }} />;
  }
  if (me.must_change_password !== pending) {
    return <Navigate to={pending ? '/' : '/password-change'} replace />;
  }
  return (
    <MeContext.Provider value={me}>
      <Outlet />
    </MeContext.Provider>
  );
}

/** Shows the screen only when the server's permission list for this user holds `permission`; otherwise a 403 page. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Me['permissions'][number];
  children: ReactNode;
}) {
  return useCurrentMe().permissions.includes(permission) ? children : <Forbidden />;
}
