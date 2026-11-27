import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Tag, Upload } from 'lucide-react';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { describeError } from '../../components/ErrorSummary';
import { Forbidden } from '../../pages/Forbidden';
import {
  averageCost,
  conditionCodes,
  conditionLabels,
  costText,
  ghs,
  itemStatusBadge,
  itemStatuses,
} from './labels';
import {
  Button,
  DataTable,
  EmptyState,
  LinkButton,
  PageHeader,
  SelectField,
  StatusWord,
  TextField,
} from '../../components/ui';
import type { Column } from '../../components/ui';

type S = components['schemas'];
type Condition = S['Item']['condition'];
type Item = S['Item'] | S['ItemWithCost'];
type Filters = {
  q: string;
  status: S['ItemStatus'] | '';
  category: string;
  brand: string;
  condition: Condition | '';
};
const none: Filters = { q: '', status: '', category: '', brand: '', condition: '' };

export function ItemsPage() {
  const me = useCurrentMe();
  const canManage = me.permissions.includes('items.manage');
  const canImport = me.permissions.includes('items.import');
  // The cost list is asked for only when /me says this user may see cost; the base list never has it.
  const withCost = me.permissions.includes('items.view_cost');
  const [filters, setFilters] = useState(none);
  const [draft, setDraft] = useState(none);
  const [page, setPage] = useState(1);
  const categories = useQuery({
    queryKey: ['items', 'categories'],
    queryFn: () => api('get', '/api/v1/item-categories/'),
  });
  const brands = useQuery({
    queryKey: ['items', 'brands'],
    queryFn: () => api('get', '/api/v1/brands/'),
  });
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['items', 'list', withCost, filters, page],
    queryFn: () => {
      const query = {
        page,
        q: filters.q || undefined,
        status: filters.status || undefined,
        condition: filters.condition || undefined,
        category_id: filters.category ? Number(filters.category) : undefined,
        brand_id: filters.brand ? Number(filters.brand) : undefined,
      };
      return withCost
        ? api('get', '/api/v1/costed-items/', { query })
        : api('get', '/api/v1/items/', { query });
    },
  });

  const data = list.data;
  if (list.error instanceof ApiError && list.error.kind === 'forbidden') return <Forbidden />;
  const columns: Column<Item>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (item) => (
        <span className="flex flex-col">
          <Link
            to={`/items/${item.id}`}
            className="inline-flex min-h-target items-center font-semibold text-ink underline"
          >
            {item.name}
          </Link>
          <span className="text-sm text-muted">
            {item.sku} · {item.brand_name ?? 'No brand'} · {item.model_name}
          </span>
        </span>
      ),
    },
    { id: 'condition', header: 'Condition', cell: (item) => conditionLabels[item.condition] },
    {
      id: 'price',
      header: 'Selling price',
      align: 'right',
      cell: (item) => (item.selling_price ? ghs(item.selling_price) : 'No selling price yet'),
    },
    ...(withCost && (data ? rowsOf(data) : []).some((i) => averageCost(i) !== undefined)
      ? [
          {
            id: 'cost',
            header: 'Average cost',
            align: 'right' as const,
            cell: (item: Item) =>
              averageCost(item) !== undefined ? costText(averageCost(item) ?? null) : '',
          },
        ]
      : []),
    {
      id: 'status',
      header: 'Status',
      cell: (item) => (
        <StatusWord
          status={itemStatusBadge[item.status].status}
          label={itemStatusBadge[item.status].label}
        />
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Items"
        actions={
          <>
            {canImport && (
              <LinkButton to="/items/import" icon={Upload} variant="secondary">
                Import from CSV
              </LinkButton>
            )}
            {canManage && (
              <LinkButton to="/items/new" icon={Plus}>
                Add an item
              </LinkButton>
            )}
          </>
        }
      />
      <form
        role="search"
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
          setPage(1);
        }}
      >
        <div className="sm:col-span-2">
          <TextField
            label="Search by name, SKU, brand, model or part number"
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          />
        </div>
        <SelectField
          label="Category"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        >
          <option value="">All</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Brand"
          value={draft.brand}
          onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
        >
          <option value="">All</option>
          {(brands.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.is_active ? '' : ' (deactivated)'}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Condition"
          value={draft.condition}
          onChange={(e) =>
            setDraft({ ...draft, condition: e.target.value as Filters['condition'] })
          }
        >
          <option value="">All</option>
          {conditionCodes.map((c) => (
            <option key={c} value={c}>
              {conditionLabels[c]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value as Filters['status'] })}
        >
          <option value="">All</option>
          {itemStatuses.map((s) => (
            <option key={s} value={s}>
              {itemStatusBadge[s].label}
            </option>
          ))}
        </SelectField>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" icon={Search} className="w-full">
            Search
          </Button>
        </div>
      </form>
      <DataTable
        caption="Items"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(i) => String(i.id)}
        state={list.isPending ? 'loading' : list.isError && !data ? 'error' : 'ready'}
        errorMessage={list.isError ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        empty={
          <EmptyState
            icon={Tag}
            title="No items match"
            description="Change the search or the filters."
          />
        }
        pagination={
          data && data.count > data.page_size
            ? {
                page: data.page,
                pageCount: Math.ceil(data.count / data.page_size),
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
