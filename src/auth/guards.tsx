import { createContext, useContext } from 'react';
import Box from '@mui/material/Box';
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
      <Box component="p" role="status" sx={{ p: 2, color: 'text.secondary' }}>
        Loading…
      </Box>
    );
  }
  // A failed refresh keeps the cached user: the screen and what was typed stay.
  if (isError && !me) {
    return (
      <Box
        role="alert"
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5, p: 2 }}
      >
        <Box component="p" sx={{ m: 0, fontWeight: 600, color: 'error.main' }}>
          Could not reach the server.
        </Box>
        <Button onClick={() => void refetch()}>Try again</Button>
      </Box>
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
