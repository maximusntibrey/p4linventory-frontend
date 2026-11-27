import { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useCurrentMe } from '../auth/guards';
import { iconForMenuKey } from '../components/menuIcons';
import { resolveEntry } from '../components/navModel';
import {
  PageHeader,
  QuickLink,
  QuickLinkGrid,
  StatCard,
  StatsStrip,
  StatusWord,
  useCompact,
} from '../components/ui';
import { Store } from 'lucide-react';
import { roleLabels } from '../features/users/labels';
import { QueryGate } from '../components/QueryGate';
import { BranchSwitchContext, useBranchFilter } from '../features/workingBranch/BranchFilter';
import { Card } from '../components/ui';

export function Home() {
  const me = useCurrentMe();
  // A menu without Home (for example Front Staff) opens on its first entry instead.
  const first = me.menu[0];
  const redirect = first && !me.menu.some((m) => m.path === '/') ? first.path : undefined;
  const { branch } = useBranchFilter();
  const compact = useCompact();
  const requestSwitch = useContext(BranchSwitchContext);
  // Only when the API allows it (Front Staff gets 403 and has no dashboard.view).
  const showDashboard = me.permissions.includes('dashboard.view');
  const dashboard = useQuery({
    queryKey: ['dashboard', branch],
    queryFn: () => api('get', '/api/v1/dashboard/', { query: { branch } }),
    enabled: !redirect && showDashboard,
  });
  if (redirect) return <Navigate to={redirect} replace />;
  // Home tiles come from the server (me.home_links), separate from the nav menu (OQ-23).
  const homeLinks = me.home_links.map(resolveEntry);
  if (compact) {
    // Direct links for everything the server lists (menu, then home tiles), once each, never Home itself.
    const seen = new Set<string>(['/']);
    const links = [...me.menu, ...me.home_links].map(resolveEntry).filter((e) => {
      if (seen.has(e.path)) return false;
      seen.add(e.path);
      return true;
    });
    const d = dashboard.data;
    // Real counts only, from the dashboard answer; a tile without a number shows none.
    const counts: Record<string, [number, string] | undefined> = {
      '/receive': d && [d.waiting_dispatches, 'waiting to be received'],
      '/dispatches': d && [d.in_transit_dispatches, 'in transit'],
      '/stock': d && [d.low_stock_count, 'low on stock'],
    };
    const canOpenStock = links.some((e) => e.path === '/stock');
    const branchName = me.all_branches
      ? 'All branches'
      : (me.working_branch?.name ?? 'No branch selected');
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Home" />
        <Card className="flex flex-col gap-2">
          <p className="m-0">
            <span className="block text-sm text-muted">Welcome</span>
            <span className="block font-semibold">{me.user.full_name}</span>
            <span className="block text-sm text-muted">{roleLabels[me.active_role]}</span>
          </p>
          {requestSwitch ? (
            <QuickLink
              icon={Store}
              label={branchName}
              detail="Working branch. Tap to switch."
              onClick={requestSwitch}
            />
          ) : (
            <p className="m-0 flex items-center gap-2 font-semibold">
              <Store aria-hidden="true" size={20} />
              <span>{branchName}</span>
            </p>
          )}
        </Card>
        {links.length > 0 && (
          <QuickLinkGrid label="Quick links">
            {links.map((e) => (
              <QuickLink
                key={e.key}
                to={e.path}
                icon={iconForMenuKey(e.key)}
                label={e.label}
                count={counts[e.path]?.[0]}
                countLabel={counts[e.path]?.[1]}
              />
            ))}
          </QuickLinkGrid>
        )}
        {showDashboard && (
          <QueryGate query={dashboard} inline>
            {(x) => (
              <>
                <StatsStrip label="Summary" columns={3}>
                  <StatCard label="Waiting to be received" value={x.waiting_dispatches} />
                  <StatCard label="In transit" value={x.in_transit_dispatches} />
                  <StatCard label="Active items" value={x.active_items} />
                </StatsStrip>
                <Card className="flex flex-col gap-2">
                  <h2 className="text-title">Low stock</h2>
                  {x.low_stock_count === 0 ? (
                    <p className="m-0 text-muted">Nothing is at or below its reorder level.</p>
                  ) : (
                    <>
                      <p className="m-0 font-semibold">
                        <StatusWord status="low" label={`${x.low_stock_count} to reorder`} />
                      </p>
                      <ul className="m-0 flex list-none flex-col gap-1 p-0">
                        {x.low_stock.slice(0, 3).map((r) => (
                          <li
                            key={`${r.location_id}-${r.item_id}`}
                            className="flex items-baseline justify-between gap-2"
                          >
                            <span className="min-w-0 truncate font-semibold">{r.item_name}</span>
                            <span className="shrink-0 text-sm text-muted">{r.available} left</span>
                          </li>
                        ))}
                      </ul>
                      {canOpenStock && (
                        <Link
                          to="/stock"
                          className="inline-flex min-h-target items-center font-semibold"
                        >
                          View all
                        </Link>
                      )}
                    </>
                  )}
                </Card>
              </>
            )}
          </QueryGate>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Home" subtitle={`Welcome, ${me.user.full_name}.`} />
      {homeLinks.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
          {homeLinks.map((m) => {
            const Icon = iconForMenuKey(m.key);
            return (
              <li key={m.key}>
                <Link
                  to={m.path}
                  className="flex min-h-14 items-center gap-2 rounded-xl border border-line bg-canvas p-3 font-semibold text-ink no-underline shadow-sm hover:bg-surface"
                >
                  <Icon aria-hidden="true" size={22} />
                  <span>{m.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {showDashboard && (
        <QueryGate query={dashboard} inline>
          {(d) => (
            <>
              {d.location && <p className="m-0 font-semibold">{d.location.name}</p>}
              <StatsStrip label="Summary" columns={3}>
                <StatCard label="Waiting to be received" value={d.waiting_dispatches} />
                <StatCard label="In transit" value={d.in_transit_dispatches} />
                <StatCard label="Active items" value={d.active_items} />
              </StatsStrip>
              <Card className="flex flex-col gap-2">
                <h2 className="text-title">Low stock</h2>
                {d.low_stock_count === 0 ? (
                  <p className="m-0 text-muted">Nothing is at or below its reorder level.</p>
                ) : (
                  <>
                    <p className="m-0 font-semibold">
                      <StatusWord status="low" label={`${d.low_stock_count} to reorder`} />
                    </p>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {d.low_stock.map((r) => (
                        <li
                          key={`${r.location_id}-${r.item_id}`}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line pb-2 last:border-0 last:pb-0"
                        >
                          <span className="font-semibold">
                            {r.item_name} <span className="font-normal text-muted">{r.sku}</span>
                          </span>
                          <span className="text-muted">
                            {r.location_name}: {r.available} available, reorder at {r.reorder_level}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {d.low_stock_count > d.low_stock.length && (
                      <p className="m-0 text-sm text-muted">
                        Showing {d.low_stock.length} of {d.low_stock_count}
                      </p>
                    )}
                  </>
                )}
              </Card>
              {d.stock_per_location && d.stock_per_location.length > 0 && (
                <Card className="flex flex-col gap-2">
                  <h2 className="text-title">Stock by location</h2>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {d.stock_per_location.map((s) => (
                      <li
                        key={s.location_id}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line pb-2 last:border-0 last:pb-0"
                      >
                        <span className="font-semibold">{s.location_name}</span>
                        <span className="text-muted">
                          {s.on_hand} on hand · {s.available} available
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </QueryGate>
      )}
    </div>
  );
}
