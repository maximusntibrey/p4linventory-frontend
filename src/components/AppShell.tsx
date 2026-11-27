import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Typography from '@mui/material/Typography';
import { api } from '../api';
import { useCurrentMe } from '../auth/guards';
import { dropBranchScoped, useLogout } from '../auth/session';
import { BranchFilterContext, BranchSwitchContext } from '../features/workingBranch/BranchFilter';
import { BranchPicker } from '../features/workingBranch/BranchPicker';
import { roleLabels } from '../features/users/labels';
import DashboardLayout from '../layout/Dashboard';
import { ShellContext } from '../layout/Dashboard/shellContext';
import { buildMenu, setMenu } from '../menu-items';

/** The signed-in frame: the Mantis drawer and header built from /me, the branch controls, the profile menu and the routed page. */
export function AppShell() {
  const me = useCurrentMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const out = useLogout(() => navigate('/login', { replace: true }));
  const [switching, setSwitching] = useState(false);
  const [filter, setFilter] = useState<number>();
  const [profile, setProfile] = useState(false);
  // The server says who must pick (me.must_pick_branch) and who works across all branches
  // (me.all_branches, Super Admin): an "All branches" view with an optional filter, never PUT working-branch.
  const allBranches = me.all_branches;
  const canSwitch = me.permissions.includes('working_branch.select') && !allBranches;
  const mustPick = me.must_pick_branch;
  const changeFilter = (id?: number) => {
    dropBranchScoped(qc);
    setFilter(id);
  };
  const menu = useMemo(() => buildMenu(me), [me]);
  setMenu(menu); // the drawer, the breadcrumbs and the header search read the shared menu object
  // Super Admin works across all branches: the page filters scope a view, they never change the working branch.
  const branchName = allBranches
    ? 'All branches'
    : (me.working_branch?.name ?? 'No branch selected');
  const role = roleLabels[me.active_role];
  const homeId = me.user.permanent_location_id;
  const sameAsWorking = homeId !== null && homeId === me.working_branch?.id;
  const home = useQuery({
    enabled: profile && homeId !== null && !sameAsWorking,
    queryKey: ['branches', 'home', homeId],
    queryFn: () => api('get', '/api/v1/branches/{id}/', { path: { id: homeId as number } }),
  });
  const location =
    homeId === null
      ? 'None'
      : sameAsWorking
        ? me.working_branch?.name
        : (home.data?.name ?? (home.isError ? 'Not available' : 'Loading…'));

  return (
    <BranchFilterContext.Provider value={{ branch: filter, setBranch: changeFilter }}>
      <BranchSwitchContext.Provider value={canSwitch ? () => setSwitching(true) : undefined}>
        <ShellContext.Provider
          value={{
            user: {
              name: me.user.full_name,
              loginId: me.user.login_id,
              role,
              location: location ?? 'None',
            },
            branchName,
            onSwitchBranch: canSwitch ? () => setSwitching(true) : undefined,
            onChangePassword: () => navigate('/account/password'),
            onLogout: out.logout,
            loggingOut: out.pending,
            logoutError: out.error ?? undefined,
            onProfileOpenChange: setProfile,
          }}
        >
          <DashboardLayout>
            {out.error && (
              <Typography
                role="alert"
                variant="subtitle1"
                component="p"
                color="error.main"
                sx={{ pb: 1 }}
              >
                {out.error}
              </Typography>
            )}
            {mustPick || switching ? (
              <BranchPicker
                onCancel={mustPick ? undefined : () => setSwitching(false)}
                onDone={() => setSwitching(false)}
              />
            ) : (
              <Outlet />
            )}
          </DashboardLayout>
        </ShellContext.Provider>
      </BranchSwitchContext.Provider>
    </BranchFilterContext.Provider>
  );
}
