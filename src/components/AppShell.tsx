import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { rowsOf } from '../api';
import { useCurrentMe } from '../auth/guards';
import { useQueryClient } from '@tanstack/react-query';
import { dropBranchScoped, useLogout } from '../auth/session';
import {
  BranchFilter,
  BranchFilterContext,
  useFilterBranches,
} from '../features/workingBranch/BranchFilter';
import { BranchPicker } from '../features/workingBranch/BranchPicker';
import { iconForMenuKey, MAX_NAV_ITEMS } from './menuIcons';
import { Nav } from './Nav';
import { TopBar } from './TopBar';

export function AppShell() {
  const me = useCurrentMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const out = useLogout(() => navigate('/login', { replace: true }));
  const [switching, setSwitching] = useState(false);
  const [filter, setFilter] = useState<number>();
  // The server says who must pick (me.must_pick_branch). No branch and no need to pick = works across all
  // branches (Super Admin): an "All branches" view with an optional filter, never PUT working-branch.
  const allBranches = !me.working_branch && !me.must_pick_branch;
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
  const items = me.menu.slice(0, MAX_NAV_ITEMS).map((m) => ({
    to: m.path,
    label: m.label,
    icon: iconForMenuKey(m.key),
  }));
  return (
    <BranchFilterContext.Provider value={{ branch: filter, setBranch: changeFilter }}>
      <div className="flex min-h-screen flex-col">
        <TopBar
          branchName={
            allBranches
              ? (filterName ?? 'All branches')
              : (me.working_branch?.name ?? 'No branch selected')
          }
          userId={me.user.login_id}
          onSwitchBranch={canSwitch ? () => setSwitching(true) : undefined}
          onLogout={out.pending ? undefined : out.logout}
        >
          {allBranches && <BranchFilter />}
          <Link
            to="/account/password"
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent underline"
          >
            Change password
          </Link>
        </TopBar>
        {out.error && (
          <p role="alert" className="m-0 px-4 pt-2 font-semibold text-bad">
            {out.error}
          </p>
        )}
        <div className="flex flex-1 flex-col md:flex-row">
          <Nav items={items} />
          <main className="min-w-0 flex-1 p-4 pb-24 md:pb-4">
            {mustPick || switching ? (
              <BranchPicker
                onCancel={mustPick ? undefined : () => setSwitching(false)}
                onDone={() => setSwitching(false)}
              />
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </BranchFilterContext.Provider>
  );
}
