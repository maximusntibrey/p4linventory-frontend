import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, rowsOf } from '../../api';
import { SelectField } from '../../components/ui';

type Filter = { branch?: number; setBranch: (id?: number) => void };

/** The Super Admin's view filter (v0.1.2): none = all branches. Passed as ?branch= to the queries that accept it. */
export const BranchFilterContext = createContext<Filter>({ setBranch: () => undefined });
export const useBranchFilter = () => useContext(BranchFilterContext);

export function useFilterBranches(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['branches', 'filter'],
    queryFn: () =>
      api('get', '/api/v1/branches/', {
        query: { kind: 'branch', is_active: true, page_size: 100 },
      }),
  });
}

/** Labelled branch filter for a user who works across all branches. Never calls PUT working-branch. */
export function BranchFilter() {
  const { branch, setBranch } = useBranchFilter();
  const list = useFilterBranches(true);
  return (
    <SelectField
      label="Filter by branch"
      value={branch ?? ''}
      onChange={(e) => setBranch(e.target.value ? Number(e.target.value) : undefined)}
    >
      <option value="">All branches</option>
      {(list.data ? rowsOf(list.data) : []).map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </SelectField>
  );
}
