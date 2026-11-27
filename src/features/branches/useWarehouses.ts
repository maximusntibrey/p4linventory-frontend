import { useQuery } from '@tanstack/react-query';
import { api, rowsOf } from '../../api';

/** Active warehouses the user can see. More than one means the form must ask which (contract 0.7.0, warehouse_id). */
export function useWarehouses() {
  const q = useQuery({
    queryKey: ['warehouses', 'active'],
    queryFn: async () =>
      rowsOf(
        await api('get', '/api/v1/branches/', {
          query: { kind: 'warehouse', is_active: true, page_size: 100 },
        }),
      ).filter((b) => b.kind === 'warehouse' && b.is_active),
  });
  const list = q.data ?? [];
  return { list, choose: list.length > 1, only: list.length === 1 ? list[0] : undefined };
}
