import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api, rowsOf } from '../../api';
import type { components } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { Select } from '../../components/Select';
import { StatusBadge } from '../../components/StatusBadge';
import {
  averageCost,
  conditionCodes,
  conditionLabels,
  costText,
  ghs,
  itemStatusBadge,
  itemStatuses,
} from './labels';

type S = components['schemas'];
type Condition = S['Item']['condition'];
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-4xl text-ink">Items</h1>
        {canManage && (
          <Link
            to="/items/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 font-semibold text-white no-underline hover:bg-accent-hover"
          >
            <Plus aria-hidden="true" size={20} />
            <span>Add an item</span>
          </Link>
        )}
      </div>
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
          <Field
            label="Search by name, SKU, brand, model or part number"
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          />
        </div>
        <Select
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
        </Select>
        <Select
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
        </Select>
        <Select
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
        </Select>
        <Select
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
        </Select>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" icon={Search} className="w-full">
            Search
          </Button>
        </div>
      </form>
      <QueryGate query={list}>
        {(data) => (
          <>
            {rowsOf(data).length === 0 ? (
              <p className="m-0 text-muted">No items match.</p>
            ) : (
              <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
                {rowsOf(data).map((item) => (
                  <li key={item.id}>
                    <Card className="flex h-full flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="min-w-0 break-words text-2xl">
                          <Link
                            to={`/items/${item.id}`}
                            className="inline-flex min-h-11 items-center text-ink underline"
                          >
                            {item.name}
                          </Link>
                        </h2>
                        <StatusBadge
                          status={itemStatusBadge[item.status].status}
                          label={itemStatusBadge[item.status].label}
                        />
                      </div>
                      <p className="m-0 text-sm text-muted">
                        {item.sku} · {item.brand_name ?? 'No brand'} · {item.model_name}
                      </p>
                      <p className="m-0 text-sm text-muted">{conditionLabels[item.condition]}</p>
                      <p className="m-0 font-semibold">
                        {item.selling_price ? ghs(item.selling_price) : 'No selling price yet'}
                      </p>
                      {withCost && averageCost(item) !== undefined && (
                        <p className="m-0 text-sm text-muted">
                          Average cost: {costText(averageCost(item) ?? null)}
                        </p>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={data} onPage={setPage} />
          </>
        )}
      </QueryGate>
    </div>
  );
}
