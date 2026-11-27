import { useState } from 'react';
import { ArrowLeftRight, Bell, KeyRound, LogOut, User } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, rowsOf } from '../api';
import { useCurrentMe } from '../auth/guards';
import { dropBranchScoped, useLogout } from '../auth/session';
import {
  BranchFilter,
  BranchFilterContext,
  BranchSwitchContext,
  useFilterBranches,
} from '../features/workingBranch/BranchFilter';
import { BranchPicker } from '../features/workingBranch/BranchPicker';
import { roleLabels } from '../features/users/labels';
import { navSections } from './navModel';
import type { CommandItem } from './ui';
import {
  AppShell as Shell,
  Button,
  CommandPalette,
  CompactBar,
  Drawer,
  Logo,
  ProfilePanel,
  Sidebar,
  Topbar,
  useCommandShortcut,
  useCompact,
} from './ui';

const NO_NOTIFICATIONS = 'No notifications yet';
const SEARCH_LABEL = 'Search or jump to';

/** The signed-in frame: sidebar and topbar from /me (phones: one slim bar and the command palette), the branch controls, the profile and the routed page. */
export function AppShell() {
  const me = useCurrentMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const out = useLogout(() => navigate('/login', { replace: true }));
  const [switching, setSwitching] = useState(false);
  const [filter, setFilter] = useState<number>();
  const [palette, setPalette] = useState(false);
  const [profile, setProfile] = useState(false);
  // Phones keep the profile inside the palette's Profile section.
  const compact = useCompact();
  const openPalette = () => setPalette(true);
  useCommandShortcut(openPalette);
  // The server says who must pick (me.must_pick_branch) and who works across all branches
  // (me.all_branches, Super Admin): an "All branches" view with an optional filter, never PUT working-branch.
  const allBranches = me.all_branches;
  const canSwitch = me.permissions.includes('working_branch.select') && !allBranches;
  const mustPick = me.must_pick_branch;
  const filterList = useFilterBranches(allBranches);
  const changeFilter = (id?: number) => {
    dropBranchScoped(qc);
    setFilter(id);
  };
  const filterName = (filterList.data ? rowsOf(filterList.data) : []).find(
    (b) => b.id === filter,
  )?.name;
  const sections = navSections(me);
  const branchName = allBranches
    ? (filterName ?? 'All branches')
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

  const places: CommandItem[] = [
    ...sections.flatMap((s) =>
      s.items.map((i) => ({ id: i.to, label: i.label, group: s.label, icon: i.icon })),
    ),
    // Phones: the Profile section of the palette holds these.
    ...(compact
      ? []
      : [
          { id: 'profile', label: 'My profile', group: 'Account', icon: User },
          ...(canSwitch
            ? [
                {
                  id: 'switch',
                  label: 'Switch working branch',
                  group: 'Account',
                  icon: ArrowLeftRight,
                },
              ]
            : []),
          { id: '/account/password', label: 'Change password', group: 'Account', icon: KeyRound },
          {
            id: 'bell',
            label: 'Notifications',
            group: 'Account',
            icon: Bell,
            disabled: NO_NOTIFICATIONS,
          },
          { id: 'logout', label: 'Log out', group: 'Account', icon: LogOut },
        ]),
  ];
  const select = (i: CommandItem) => {
    setPalette(false);
    if (i.id === 'profile') setProfile(true);
    else if (i.id === 'switch') setSwitching(true);
    else if (i.id === 'logout') out.logout();
    else navigate(i.id);
  };
  const panel = (afterAction: () => void) => (
    <ProfilePanel
      user={{ name: me.user.full_name, loginId: me.user.login_id, role, location }}
      branch={{
        name: branchName,
        // On desktop the top bar already holds this filter.
        extra: allBranches && compact && <BranchFilter />,
        onSwitch: canSwitch
          ? () => {
              afterAction();
              setSwitching(true);
            }
          : undefined,
      }}
      notificationsText={NO_NOTIFICATIONS}
      onChangePassword={() => {
        afterAction();
        navigate('/account/password');
      }}
      onLogout={out.logout}
      loggingOut={out.pending}
      error={out.error}
    />
  );

  return (
    <BranchFilterContext.Provider value={{ branch: filter, setBranch: changeFilter }}>
      <BranchSwitchContext.Provider value={canSwitch ? () => setSwitching(true) : undefined}>
        <Shell
          sidebar={
            <Sidebar
              sections={sections}
              header={(collapsed) => (
                <Link to="/" aria-label="Payless4Laptops home">
                  <Logo variant={collapsed ? 'mark' : 'full'} />
                </Link>
              )}
              footer={(collapsed) =>
                collapsed ? null : (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="secondary"
                      icon={LogOut}
                      onClick={out.logout}
                      disabled={out.pending}
                    >
                      Log out
                    </Button>
                  </div>
                )
              }
            />
          }
          compactBar={
            <CompactBar search={{ label: `${SEARCH_LABEL}…`, onOpen: () => openPalette() }} />
          }
          topbar={
            <Topbar
              notifications={{
                count: 0,
                onClick: () => undefined,
                unavailable: NO_NOTIFICATIONS,
              }}
              user={{
                name: me.user.full_name,
                email: me.user.login_id,
                onClick: () => setProfile(true),
              }}
            >
              <span className="flex min-h-target items-center rounded-pill bg-primary-soft px-3 font-semibold">
                {branchName}
              </span>
              {allBranches && <BranchFilter />}
              {canSwitch && (
                <Button
                  variant="secondary"
                  icon={ArrowLeftRight}
                  onClick={() => setSwitching(true)}
                >
                  Switch branch
                </Button>
              )}
            </Topbar>
          }
        >
          {out.error && (
            <p role="alert" className="m-0 pb-2 font-semibold text-bad">
              {out.error}
            </p>
          )}
          {mustPick || switching ? (
            <BranchPicker
              onCancel={mustPick ? undefined : () => setSwitching(false)}
              onDone={() => setSwitching(false)}
            />
          ) : (
            <Outlet />
          )}
        </Shell>
        <CommandPalette
          open={palette}
          onClose={() => setPalette(false)}
          label={SEARCH_LABEL}
          items={places}
          onSelect={select}
          profile={compact ? panel(() => setPalette(false)) : undefined}
        />
        {!compact && (
          <Drawer open={profile} onClose={() => setProfile(false)} title="Profile">
            {panel(() => setProfile(false))}
          </Drawer>
        )}
      </BranchSwitchContext.Provider>
    </BranchFilterContext.Provider>
  );
}
