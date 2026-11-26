import { Boxes, Home, Inbox, Package, Settings, Truck } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AppShell,
  Avatar,
  AvatarCell,
  BulkActionBar,
  Button,
  Checkbox,
  ColumnVisibilityMenu,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  FormField,
  IconButton,
  Input,
  Logo,
  Modal,
  PageHeader,
  SearchInput,
  SegmentedControl,
  Select,
  Sidebar,
  Skeleton,
  SkeletonText,
  StatCard,
  StatsStrip,
  StatusBadge,
  Switch,
  Tabs,
  ToastProvider,
  Toolbar,
  Topbar,
  useToast,
  widthStyle,
} from '../components/ui';
import type { Column, SortState, Tone } from '../components/ui';

const swatches: { name: string; cls: string }[] = [
  { name: 'primary (accent, icons, large graphics)', cls: 'bg-primary text-ink' },
  { name: 'amber', cls: 'bg-amber text-ink' },
  { name: 'amber-light', cls: 'bg-amber-light text-ink' },
  { name: 'primary-solid (white-text fill)', cls: 'bg-primary-solid text-on-primary' },
  { name: 'primary-solid-hover', cls: 'bg-primary-solid-hover text-on-primary' },
  { name: 'primary-soft', cls: 'bg-primary-soft text-ink' },
  { name: 'primary-soft-strong', cls: 'bg-primary-soft-strong text-ink' },
  { name: 'ink (navy text)', cls: 'bg-ink text-on-primary' },
  { name: 'muted (slate)', cls: 'bg-muted text-on-primary' },
  { name: 'surface', cls: 'bg-surface text-ink' },
  { name: 'ok / ok-bg', cls: 'bg-ok-bg text-ok' },
  { name: 'warn / warn-bg', cls: 'bg-warn-bg text-warn' },
  { name: 'bad / bad-bg', cls: 'bg-bad-bg text-bad' },
  { name: 'info / info-bg', cls: 'bg-info-bg text-info' },
];

type Row = { id: string; name: string; sku: string; qty: number; tone: Tone; status: string };
const rows: Row[] = [
  {
    id: '1',
    name: 'Dell Latitude 7490',
    sku: 'LAP-0001',
    qty: 12,
    tone: 'success',
    status: 'In stock',
  },
  { id: '2', name: 'HP EliteBook 840 G5', sku: 'LAP-0002', qty: 2, tone: 'warning', status: 'Low' },
  {
    id: '3',
    name: 'Lenovo ThinkPad T480',
    sku: 'LAP-0003',
    qty: 0,
    tone: 'danger',
    status: 'Out of stock',
  },
  { id: '4', name: 'Acer Swift 3', sku: 'LAP-0004', qty: 7, tone: 'success', status: 'In stock' },
];
const columns: Column<Row>[] = [
  {
    id: 'name',
    header: 'Item',
    cell: (r) => <AvatarCell name={r.name} subtitle={r.sku} />,
    sortValue: (r) => r.name,
  },
  { id: 'qty', header: 'On hand', cell: (r) => r.qty, sortValue: (r) => r.qty, align: 'right' },
  {
    id: 'status',
    header: 'Status',
    cell: (r) => <StatusBadge tone={r.tone}>{r.status}</StatusBadge>,
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="flex flex-col gap-3">
      <h2 id={`ds-${title}`} className="text-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Toasts() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      {(['success', 'warning', 'danger', 'info', 'neutral'] as const).map((tone) => (
        <Button
          key={tone}
          variant="secondary"
          onClick={() => toast({ title: `A ${tone} toast`, tone })}
        >
          {`Show ${tone}`}
        </Button>
      ))}
    </div>
  );
}

function Overlays() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => setModal(true)}>
        Open modal
      </Button>
      <Button variant="secondary" onClick={() => setDrawer(true)}>
        Open drawer
      </Button>
      <Button variant="danger" onClick={() => setConfirm(true)}>
        Open confirm dialog
      </Button>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Edit item"
        footer={<Button onClick={() => setModal(false)}>Save</Button>}
      >
        <FormField label="Item name">
          {(c) => <Input {...c} defaultValue="Dell Latitude 7490" />}
        </FormField>
      </Modal>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filters">
        <Checkbox label="Only low stock" />
      </Drawer>
      <ConfirmDialog
        open={confirm}
        title="Deactivate this user?"
        description="They can no longer sign in. You can reactivate them later."
        confirmLabel="Deactivate"
        tone="danger"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

function TableDemo() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['2']));
  const [visible, setVisible] = useState(['name', 'qty', 'status']);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [stats, setStats] = useState(true);
  const [sortKey, setSortKey] = useState('name');
  const [sort, setSort] = useState<SortState>(null);
  return (
    <div className="flex flex-col gap-3">
      <Toolbar
        search={{ label: 'Search items', value: query, onChange: setQuery }}
        onFilter={() => undefined}
        sort={{
          value: sortKey,
          onChange: setSortKey,
          options: [
            { value: 'name', label: 'Name' },
            { value: 'qty', label: 'On hand' },
          ],
        }}
        onExport={() => undefined}
        view={{
          label: 'View',
          value: view,
          onChange: setView,
          options: [
            { value: 'list', label: 'List' },
            { value: 'grid', label: 'Grid' },
          ],
        }}
        statistics={{ checked: stats, onChange: setStats }}
        primary={{ label: 'Add item', onClick: () => undefined }}
      >
        <ColumnVisibilityMenu columns={columns} visible={visible} onChange={setVisible} />
      </Toolbar>
      {stats && (
        <StatsStrip label="Key figures">
          <StatCard
            label="Total stock"
            value="1,204"
            info="Units on hand across all locations"
            delta={{ value: '+4.2%', direction: 'up' }}
          />
          <StatCard
            label="Low stock"
            value="7"
            delta={{ value: '+2', direction: 'up', good: false }}
          />
          <StatCard
            label="Returns"
            value="12"
            delta={{ value: '-3%', direction: 'down', good: true }}
          />
          <StatCard label="In transit" value="31" />
        </StatsStrip>
      )}
      <DataTable
        caption="Items, ready state"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowLabel={(r) => r.name}
        visibleColumns={visible}
        selected={selected}
        onSelectedChange={setSelected}
        sort={sort}
        onSortChange={setSort}
        pagination={{
          page,
          pageCount: 12,
          onPageChange: setPage,
          pageSize: size,
          onPageSizeChange: setSize,
        }}
      />
      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Button variant="secondary" icon={Truck}>
          Dispatch
        </Button>
      </BulkActionBar>
      <DataTable
        caption="Items, loading state"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        state="loading"
      />
      <DataTable
        caption="Items, error state"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        state="error"
        onRetry={() => undefined}
      />
      <DataTable caption="Items, empty state" columns={columns} rows={[]} rowKey={(r) => r.id} />
    </div>
  );
}

function FormsDemo() {
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState('a');
  const [card, setCard] = useState('retail');
  const [q, setQ] = useState('');
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField label="Item name" help="As printed on the box">
        {(c) => <Input {...c} placeholder="Dell Latitude" />}
      </FormField>
      <FormField label="Quantity" error="Quantity must be a whole number">
        {(c) => <Input {...c} defaultValue="1.5" />}
      </FormField>
      <FormField label="Branch" required>
        {(c) => (
          <Select {...c}>
            <option>Accra</option>
            <option>Kumasi</option>
          </Select>
        )}
      </FormField>
      <FormField label="Disabled field">
        {(c) => <Input {...c} disabled defaultValue="Locked" />}
      </FormField>
      <SearchInput label="Search the catalogue" value={q} onValueChange={setQ} shortcutHint="⌘K" />
      <div className="flex flex-col">
        <Checkbox label="Checkbox" description="With a description" />
        <Checkbox label="Indeterminate" indeterminate />
        <Checkbox label="Disabled" disabled />
      </div>
      <Switch label="Switch" checked={on} onCheckedChange={setOn} />
      <SegmentedControl
        label="Segments"
        value={seg}
        onValueChange={setSeg}
        options={[
          { value: 'a', label: 'Day', icon: Home },
          { value: 'b', label: 'Week' },
          { value: 'c', label: 'Month' },
        ]}
      />
      <div className="md:col-span-2">
        <SegmentedControl
          label="Radio cards"
          variant="cards"
          value={card}
          onValueChange={setCard}
          options={[
            {
              value: 'retail',
              label: 'Retail sale',
              icon: Package,
              description: 'One laptop to a walk-in customer',
            },
            {
              value: 'transfer',
              label: 'Transfer',
              icon: Truck,
              description: 'Move stock to another branch',
            },
          ]}
        />
      </div>
    </div>
  );
}

function ShellDemo() {
  const [q, setQ] = useState('');
  return (
    <>
      <div className="h-[28rem] overflow-auto rounded-lg border border-line">
        <AppShell
          embedded
          sidebar={
            <Sidebar
              label="Showcase sidebar"
              sections={[
                { items: [{ to: '/design-system', label: 'Design system', icon: Home }] },
                {
                  label: 'Inventory',
                  items: [
                    { to: '/items', label: 'Items', icon: Boxes, badge: 12 },
                    { to: '/stock', label: 'Stock', icon: Package },
                  ],
                },
                { label: 'Admin', items: [{ to: '/settings', label: 'Settings', icon: Settings }] },
              ]}
              header={(collapsed) => <Logo variant={collapsed ? 'mark' : 'full'} />}
              footer={(collapsed) => (
                <p className="m-0 text-sm text-muted">{collapsed ? 'v1' : 'Signed in at Accra'}</p>
              )}
            />
          }
          topbar={
            <Topbar
              search={{ label: 'Search everything', value: q, onChange: setQ }}
              notifications={{ count: 3, onClick: () => undefined }}
              user={{ name: 'Ama Mensah', email: 'ama@example.com' }}
            />
          }
        >
          <PageHeader
            title="Items"
            subtitle="Everything we sell"
            actions={<Button>New item</Button>}
          />
        </AppShell>
      </div>
    </>
  );
}

/** Living showcase of every token and component in every state. Lazy-loaded; gated in routes.tsx. */
export default function DesignSystem() {
  const [tab, setTab] = useState('tokens');
  return (
    <ToastProvider>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <PageHeader
          title="Design system"
          subtitle="Tokens and components. Add new components here first."
          actions={<Logo />}
        />
        <Tabs
          label="Showcase sections"
          value={tab}
          onValueChange={setTab}
          tabs={[
            {
              id: 'tokens',
              label: 'Tokens',
              panel: (
                <div className="flex flex-col gap-4">
                  <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 md:grid-cols-3">
                    {swatches.map((s) => (
                      <li
                        key={s.name}
                        className={`rounded-lg border border-line p-3 text-sm font-semibold ${s.cls}`}
                      >
                        {s.name}
                      </li>
                    ))}
                  </ul>
                  <p className="m-0 font-display text-display">Bebas Neue display 1,204</p>
                  <p className="m-0">
                    Inter body text, forms, tables, IDs and prices: GHS 1,250.00
                  </p>
                  <div
                    role="img"
                    aria-label="Progress 40 percent"
                    className="h-3 w-full rounded-pill bg-surface"
                  >
                    <div style={widthStyle(40)} className="h-3 rounded-pill bg-primary-solid" />
                  </div>
                </div>
              ),
            },
            {
              id: 'actions',
              label: 'Actions and badges',
              panel: (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {(['primary', 'secondary', 'ghost', 'danger'] as const).map((v) => (
                      <Button key={v} variant={v} icon={Inbox}>
                        {v}
                      </Button>
                    ))}
                    <Button size="sm">Small</Button>
                    <Button size="lg">Large</Button>
                    <Button loading>Saving</Button>
                    <Button disabled>Disabled</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <IconButton icon={Home} label="Home" />
                    <IconButton icon={Settings} label="Settings" shape="square" showLabel />
                    <IconButton icon={Inbox} label="Messages" badge={5} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      ['success', 'warning', 'danger', 'info', 'neutral', 'brand'] as const
                    ).flatMap((t) => [
                      <StatusBadge key={t} tone={t}>{`${t} soft`}</StatusBadge>,
                      <StatusBadge
                        key={`${t}-o`}
                        tone={t}
                        variant="outline"
                      >{`${t} outline`}</StatusBadge>,
                    ])}
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar name="Ama Mensah" size="sm" />
                    <Avatar name="Kofi Annan" />
                    <Avatar name="Esi Owusu" size="lg" />
                  </div>
                  <Toasts />
                  <Overlays />
                </div>
              ),
            },
            { id: 'forms', label: 'Forms', panel: <FormsDemo /> },
            { id: 'data', label: 'Data', panel: <TableDemo /> },
            {
              id: 'feedback',
              label: 'Feedback',
              panel: (
                <div className="flex flex-col gap-4">
                  <EmptyState
                    icon={Inbox}
                    title="No items yet"
                    description="Add the first item to see it here."
                    action={<Button>Add item</Button>}
                  />
                  <div aria-busy="true" className="flex flex-col gap-3">
                    <Skeleton className="h-8 w-40" />
                    <SkeletonText lines={3} />
                  </div>
                </div>
              ),
            },
            {
              id: 'shell',
              label: 'App shell',
              panel: (
                <Section title="AppShell with Sidebar and Topbar">
                  <ShellDemo />
                </Section>
              ),
            },
          ]}
        />
      </div>
    </ToastProvider>
  );
}
