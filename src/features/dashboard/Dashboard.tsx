import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { rowsOf } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import type { Me } from '../../auth/session';
import { formatAccra } from '../../lib/time';
import { dispatchStatusBadge, unitsSent } from '../dispatches/labels';
import { saleStatusLabels } from '../sales/labels';
import { useBranchFilter } from '../workingBranch/BranchFilter';
import { BranchScope } from '../workingBranch/BranchScope';
import { PanelCard, StatCard, stateOf } from './blocks';
import { accraDay, cedis, toCents, useDashboardData } from './data';

type Perm = Me['permissions'][number];

const SALES_NEED = 'a daily sales summary from the sales API';

/** Quick actions: direct links, each shown only when the server's permission list allows it. */
const quickActions: { perm: Perm; to: string; label: string }[] = [
  { perm: 'sales.record', to: '/sell', label: 'Sell' },
  { perm: 'find.use', to: '/find', label: 'Find an item' },
  { perm: 'items.view', to: '/items', label: 'Items' },
  { perm: 'dispatches.waiting', to: '/receive', label: 'Receive stock' },
  { perm: 'dispatches.create', to: '/dispatches/new', label: 'New dispatch' },
  { perm: 'goods_receipts.manage', to: '/goods-receipts', label: 'Goods receipt' },
  { perm: 'items.manage', to: '/items/new', label: 'Add item' },
  { perm: 'items.import', to: '/items/import', label: 'Import CSV' },
];

function Row({
  primary,
  secondary,
  end,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <ListItem divider disableGutters sx={{ minHeight: 44, gap: 1 }}>
      <ListItemText
        primary={primary}
        secondary={secondary}
        slotProps={{ primary: { variant: 'subtitle1', component: 'span', noWrap: true } }}
      />
      {end}
    </ListItem>
  );
}

const spacing = {
  rowSpacing: { xs: 2.5, md: 2.75 },
  columnSpacing: { xs: 1.5, md: 2.75 },
} as const;

/** The home dashboard: Mantis stat, chart and list cards. A card shows what the API gives; otherwise it says "Not available yet" and shows no numbers. */
export function Dashboard() {
  const me = useCurrentMe();
  const { branch } = useBranchFilter();
  const theme = useTheme();
  const vars = theme.vars!; // the Mantis theme always uses CSS variables
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const has = (p: Perm) => me.permissions.includes(p);
  const q = useDashboardData(has, branch);
  const d = q.dashboard.data;
  const dState = stateOf(q.dashboard);
  const chartHeight = compact ? 200 : 260;

  // Sales: one 7-day read feeds today's figures, the chart and the recent list. If it does not fit one page, totals are not shown.
  const sales = q.sales.data ? rowsOf(q.sales.data) : [];
  const salesComplete = q.sales.data ? q.sales.data.count <= sales.length : false;
  const done = sales.filter((s) => s.status === 'completed');
  const today = accraDay(0);
  const todayDone = done.filter((s) => s.sold_at.slice(0, 10) === today);
  const days = Array.from({ length: 7 }, (_, i) => accraDay(6 - i));
  const perDay = days.map(
    (day) =>
      done.filter((s) => s.sold_at.slice(0, 10) === day).reduce((n, s) => n + toCents(s.total), 0) /
      100,
  );
  const salesState = q.sales.isPending
    ? 'loading'
    : q.sales.isError
      ? 'error'
      : salesComplete
        ? 'ready'
        : 'planned';

  const locations = d?.stock_per_location;
  const warehouseIds = new Set((q.warehouses.data ?? []).map((w) => w.id));
  const units = locations?.reduce((n, l) => n + l.on_hand, 0);
  const inWarehouse = (locations ?? [])
    .filter((l) => warehouseIds.has(l.location_id))
    .reduce((n, l) => n + l.on_hand, 0);

  const stats: ReactNode[] = [];
  const add = (key: string, node: ReactNode) =>
    stats.push(
      <Grid key={key} size={{ xs: 6, md: 3 }}>
        {node}
      </Grid>,
    );

  if (locations)
    add(
      'units',
      <StatCard
        title="Units in stock"
        value={units?.toLocaleString('en-GB')}
        caption="On hand, all locations"
        to="/stock"
        linkLabel="View stock"
        state={dState}
        query={q.dashboard}
      />,
    );
  if (has('dashboard.view'))
    add(
      'low',
      <StatCard
        title="Low stock items"
        value={d?.low_stock_count}
        caption="At or below reorder level"
        to="/stock"
        linkLabel="View stock"
        state={dState}
        query={q.dashboard}
      />,
    );
  if (has('sales.record'))
    add(
      'today',
      <StatCard
        title="Today's sales"
        value={cedis(todayDone.reduce((n, s) => n + toCents(s.total), 0))}
        caption={`${todayDone.length} completed`}
        to="/sell/sales"
        linkLabel="View sales"
        state={salesState}
        query={q.sales}
        need={SALES_NEED}
      />,
    );
  if (has('dispatches.waiting'))
    add(
      'waiting',
      <StatCard
        title="Waiting receipts"
        value={d ? d.waiting_dispatches : q.waiting.data?.count}
        caption="Dispatches to receive here"
        to="/receive"
        linkLabel="Receive"
        state={has('dashboard.view') ? dState : stateOf(q.waiting)}
        query={has('dashboard.view') ? q.dashboard : q.waiting}
      />,
    );
  if (has('shortfalls.resolve'))
    add(
      'shortfalls',
      <StatCard
        title="Open shortfalls"
        value={q.shortfalls.data?.count}
        caption="Lines still to resolve"
        to="/shortfalls"
        linkLabel="Resolve"
        state={stateOf(q.shortfalls)}
        query={q.shortfalls}
      />,
    );
  if (has('dashboard.view'))
    add(
      'transit',
      <StatCard
        title="In transit"
        value={d?.in_transit_dispatches}
        caption="Open dispatches"
        to="/dispatches"
        linkLabel="View dispatches"
        state={dState}
        query={q.dashboard}
      />,
    );
  if (has('items.view_cost'))
    add(
      'value',
      <StatCard
        title="Stock value at cost"
        value=""
        state="planned"
        need="a stock value total (cost x quantity) from the costed-stock API"
      />,
    );
  if (has('items.manage'))
    add(
      'noprice',
      <StatCard
        title="Items without a selling price"
        value=""
        state="planned"
        need="a count of active items with no selling price"
      />,
    );

  const charts: ReactNode[] = [];
  const addChart = (key: string, node: ReactNode) =>
    charts.push(
      <Grid key={key} size={{ xs: 12, md: 6 }}>
        {node}
      </Grid>,
    );
  if (has('sales.record'))
    addChart(
      'sales7',
      <PanelCard title="Sales last 7 days" state={salesState} query={q.sales} need={SALES_NEED}>
        <Box
          role="img"
          aria-label={`Sales last 7 days in GHS: ${days.map((d, i) => `${d} ${perDay[i]}`).join(', ')}`}
        >
          <Box aria-hidden="true">
            <LineChart
              height={chartHeight}
              hideLegend
              series={[
                {
                  data: perDay,
                  area: true,
                  color: vars.palette.primary[400],
                  label: 'Sales (GHS)',
                },
              ]}
              xAxis={[{ scaleType: 'point', data: days.map((x) => x.slice(5)) }]}
              margin={{ left: 8, right: 16 }}
            />
          </Box>
        </Box>
      </PanelCard>,
    );
  if (locations)
    addChart(
      'stockloc',
      <PanelCard
        title="Stock by location"
        state="ready"
        empty={locations.length === 0 ? 'No stock yet.' : undefined}
      >
        <Box
          role="img"
          aria-label={`Units on hand by location: ${locations.map((l) => `${l.location_name} ${l.on_hand}`).join(', ')}`}
        >
          <Box aria-hidden="true">
            <BarChart
              height={chartHeight}
              hideLegend
              series={[
                {
                  data: locations.map((l) => l.on_hand),
                  label: 'On hand',
                  color: vars.palette.navy.main,
                },
              ]}
              xAxis={[
                {
                  scaleType: 'band',
                  data: locations.map((l) => l.location_name),
                  categoryGapRatio: 0.4,
                },
              ]}
              slotProps={{ bar: { rx: 4, ry: 4 } }}
            />
          </Box>
        </Box>
      </PanelCard>,
    );
  if (locations)
    addChart(
      'split',
      <PanelCard
        title="Warehouse and branch stock"
        state={q.warehouses.isPending ? 'loading' : q.warehouses.isError ? 'error' : 'ready'}
        query={q.warehouses}
        empty={units === 0 ? 'No stock yet.' : undefined}
      >
        <Box
          role="img"
          aria-label={`Units on hand: warehouse ${inWarehouse}, branches ${(units ?? 0) - inWarehouse}`}
        >
          <Box aria-hidden="true">
            <PieChart
              height={chartHeight}
              series={[
                {
                  innerRadius: 50,
                  data: [
                    {
                      id: 'wh',
                      value: inWarehouse,
                      label: 'Warehouse',
                      color: vars.palette.navy.main,
                    },
                    {
                      id: 'br',
                      value: (units ?? 0) - inWarehouse,
                      label: 'Branches',
                      color: vars.palette.primary[400],
                    },
                  ],
                },
              ]}
            />
          </Box>
        </Box>
      </PanelCard>,
    );
  if (has('sales.record') || has('dashboard.view'))
    addChart(
      'top',
      <PanelCard
        title="Top selling items"
        state="planned"
        need="sales totals per item from the sales API"
      >
        {null}
      </PanelCard>,
    );

  const lists: ReactNode[] = [];
  const addList = (key: string, node: ReactNode) =>
    lists.push(
      <Grid key={key} size={{ xs: 12, md: 6 }}>
        {node}
      </Grid>,
    );
  const actions = quickActions.filter((a) => has(a.perm));
  if (actions.length)
    addList(
      'quick',
      <PanelCard title="Quick actions" state="ready">
        <Stack sx={{ gap: 1 }}>
          {actions.map((a) => (
            <Button
              key={a.to}
              component={RouterLink}
              to={a.to}
              variant="outlined"
              color="secondary"
              size="large"
              sx={{ justifyContent: 'flex-start', minHeight: 44 }}
            >
              {a.label}
            </Button>
          ))}
        </Stack>
      </PanelCard>,
    );
  if (has('dashboard.view'))
    addList(
      'lowlist',
      <PanelCard
        title="Low stock"
        action={{ to: '/stock', label: 'View all' }}
        state={dState}
        query={q.dashboard}
        empty={
          d && d.low_stock.length === 0 ? 'Nothing is at or below its reorder level.' : undefined
        }
      >
        <List disablePadding aria-label="Low stock items">
          {(d?.low_stock ?? []).map((r) => (
            <Row
              key={`${r.location_id}-${r.item_id}`}
              primary={r.item_name}
              secondary={`${r.sku} at ${r.location_name}`}
              end={
                <Typography variant="subtitle1" component="span">
                  {r.available} of {r.reorder_level}
                </Typography>
              }
            />
          ))}
        </List>
        {d && d.low_stock_count > d.low_stock.length && (
          <Typography variant="caption" component="p" color="text.secondary" sx={{ pt: 1 }}>
            Showing {d.low_stock.length} of {d.low_stock_count}
          </Typography>
        )}
      </PanelCard>,
    );
  if (has('dispatches.view')) {
    const rows = q.dispatches.data ? rowsOf(q.dispatches.data).slice(0, 5) : [];
    addList(
      'dispatches',
      <PanelCard
        title="Recent dispatches"
        action={{ to: '/dispatches', label: 'View all' }}
        state={stateOf(q.dispatches)}
        query={q.dispatches}
        empty={q.dispatches.data && rows.length === 0 ? 'No dispatches yet.' : undefined}
      >
        <List disablePadding aria-label="Recent dispatches">
          {rows.map((r) => (
            <Row
              key={r.id}
              primary={`${r.reference}: ${r.origin.name} to ${r.destination.name}`}
              secondary={`${unitsSent(r)} units, ${formatAccra(r.dispatched_at)}`}
              end={
                <Chip
                  size="small"
                  variant="light"
                  color={
                    r.status === 'completed'
                      ? 'success'
                      : r.status === 'rejected'
                        ? 'error'
                        : 'info'
                  }
                  label={dispatchStatusBadge[r.status].label}
                />
              }
            />
          ))}
        </List>
      </PanelCard>,
    );
  }
  if (has('sales.record'))
    addList(
      'recentsales',
      <PanelCard
        title="Recent sales"
        action={{ to: '/sell/sales', label: 'View all' }}
        state={salesState === 'planned' ? 'ready' : salesState}
        query={q.sales}
        empty={q.sales.data && sales.length === 0 ? 'No sales in the last 7 days.' : undefined}
      >
        <List disablePadding aria-label="Recent sales">
          {sales.slice(0, 5).map((s) => (
            <Row
              key={s.id}
              primary={`${s.reference}: GHS ${s.total}`}
              secondary={formatAccra(s.sold_at)}
              end={
                <Chip
                  size="small"
                  variant="light"
                  color={s.status === 'completed' ? 'success' : 'warning'}
                  label={saleStatusLabels[s.status]}
                />
              }
            />
          ))}
        </List>
      </PanelCard>,
    );
  if (has('sales.cancel'))
    addList(
      'cancelled',
      <PanelCard
        title="Cancelled sales today"
        state="planned"
        need="a list of today's cancelled sales with reasons from the sales API"
      >
        {null}
      </PanelCard>,
    );

  return (
    <Grid container rowSpacing={{ xs: 2.5, md: 4.5 }} columnSpacing={spacing.columnSpacing}>
      <Grid size={12}>
        <Typography variant="h3" component="h1">
          Home
        </Typography>
        {me.all_branches ? (
          <Box sx={{ mt: 1.5, maxWidth: 320 }}>
            <BranchScope />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Working branch: {me.working_branch?.name ?? 'No branch selected'}
          </Typography>
        )}
      </Grid>
      {stats}
      {charts.length > 0 && (
        <Grid size={12}>
          <Grid container {...spacing}>
            {charts}
          </Grid>
        </Grid>
      )}
      {lists.length > 0 && (
        <Grid size={12}>
          <Grid container {...spacing}>
            {lists}
          </Grid>
        </Grid>
      )}
    </Grid>
  );
}
