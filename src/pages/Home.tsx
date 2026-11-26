import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useCurrentMe } from '../auth/guards';
import { iconForMenuKey } from '../components/menuIcons';
import { resolveEntry } from '../components/navModel';
import { PageHeader, StatCard, StatsStrip } from '../components/ui';
import { QueryGate } from '../components/QueryGate';
import { StatusBadge } from '../components/StatusBadge';
import { useBranchFilter } from '../features/workingBranch/BranchFilter';
import { Card } from '../components/ui';

export function Home() {
  const me = useCurrentMe();
  // A menu without Home (for example Front Staff) opens on its first entry instead.
  const first = me.menu[0];
  const redirect = first && !me.menu.some((m) => m.path === '/') ? first.path : undefined;
  const { branch } = useBranchFilter();
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
              <StatsStrip label="Summary">
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
                      <StatusBadge status="low" label={`${d.low_stock_count} to reorder`} />
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
