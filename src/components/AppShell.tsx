import { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { rowsOf } from '../api';
import { useCurrentMe } from '../auth/guards';
import { dropBranchScoped, useLogout } from '../auth/session';
import {
  BranchFilter,
  BranchFilterContext,
  useFilterBranches,
} from '../features/workingBranch/BranchFilter';
import { BranchPicker } from '../features/workingBranch/BranchPicker';
import { navSections } from './navModel';
import { AppShell as Shell, Button, CommandPalette, Logo, Sidebar, Topbar } from './ui';

/** The signed-in frame: sidebar and topbar from /me, the branch controls, and the routed page. */
export function AppShell() {
  const me = useCurrentMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const out = useLogout(() => navigate('/login', { replace: true }));
  const [switching, setSwitching] = useState(false);
  const [filter, setFilter] = useState<number>();
  const [palette, setPalette] = useState(false);
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
  const places = [
    ...sections.flatMap((s) =>
      s.items.map((i) => ({ id: i.to, label: i.label, hint: s.label, icon: i.icon })),
    ),
    { id: '/account/password', label: 'Change password', hint: 'Account', icon: KeyRound },
  ];
  const branchName = allBranches
    ? (filterName ?? 'All branches')
    : (me.working_branch?.name ?? 'No branch selected');

  return (
    <BranchFilterContext.Provider value={{ branch: filter, setBranch: changeFilter }}>
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
        topbar={
          <Topbar
            commandSearch={{ label: 'Search or jump to…', onOpen: () => setPalette(true) }}
            notifications={{
              count: 0,
              onClick: () => undefined,
              unavailable: 'No notifications yet',
            }}
            user={{
              name: me.user.full_name,
              email: me.user.login_id,
              onClick: () => navigate('/account/password'),
            }}
          >
            <span className="flex min-h-target items-center rounded-pill bg-primary-soft px-3 font-semibold">
              {branchName}
            </span>
            {allBranches && <BranchFilter />}
            {canSwitch && (
              <Button variant="secondary" icon={ArrowLeftRight} onClick={() => setSwitching(true)}>
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
        label="Search or jump to"
        items={places}
        onSelect={(i) => {
          setPalette(false);
          navigate(i.id);
        }}
      />
    </BranchFilterContext.Provider>
  );
}
