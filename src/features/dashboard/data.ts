import { useQuery } from '@tanstack/react-query';
import { api, rowsOf } from '../../api';
import type { Me } from '../../auth/session';

/** Calendar day in Africa/Accra (UTC+0 all year), as YYYY-MM-DD. */
export const accraDay = (daysAgo = 0) => {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
};

export { toCents } from '../sales/labels';
export const cedis = (pesewas: number) =>
  `GHS ${(pesewas / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Has = (p: Me['permissions'][number]) => boolean;

/** All reads for the dashboard cards. Each one runs only when the server's permission list allows it; the server still checks every request. */
export function useDashboardData(has: Has, branch: number | undefined) {
  const dashboard = useQuery({
    queryKey: ['dashboard', branch],
    queryFn: () => api('get', '/api/v1/dashboard/', { query: { branch } }),
    enabled: has('dashboard.view'),
  });
  const shortfalls = useQuery({
    queryKey: ['dashboard-card', 'shortfalls-open'],
    queryFn: () => api('get', '/api/v1/shortfalls/', { query: { status: 'open', page_size: 1 } }),
    enabled: has('shortfalls.resolve'),
  });
  const sales = useQuery({
    queryKey: ['dashboard-card', 'sales-7d', branch],
    queryFn: () =>
      api('get', '/api/v1/sales/', {
        query: { date_from: accraDay(6), date_to: accraDay(0), page_size: 100, branch },
      }),
    enabled: has('sales.record'),
  });
  // Users without the dashboard (Front Staff) get the waiting count from the dispatches API they may call.
  const waiting = useQuery({
    queryKey: ['dashboard-card', 'waiting'],
    queryFn: () => api('get', '/api/v1/dispatches/waiting/', { query: { page_size: 1 } }),
    enabled: has('dispatches.waiting') && !has('dashboard.view'),
  });
  const dispatches = useQuery({
    queryKey: ['dashboard-card', 'dispatches-recent'],
    queryFn: () => api('get', '/api/v1/dispatches/', { query: { page_size: 5 } }),
    enabled: has('dispatches.view'),
  });
  const warehouses = useQuery({
    queryKey: ['dashboard-card', 'warehouses'],
    queryFn: async () =>
      rowsOf(
        await api('get', '/api/v1/branches/', {
          query: { kind: 'warehouse', is_active: true, page_size: 100 },
        }),
      ),
    enabled: has('dashboard.view') && has('branches.view'),
  });
  return { dashboard, shortfalls, sales, waiting, dispatches, warehouses };
}
