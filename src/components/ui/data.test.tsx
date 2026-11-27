import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import {
  AvatarCell,
  BulkActionBar,
  Button,
  ColumnVisibilityMenu,
  DataTable,
  Pagination,
  StatusBadge,
  Toolbar,
  pageWindow,
} from '.';
import type { Column, SortState } from '.';

type Row = { id: string; name: string; qty: number; status: 'In stock' | 'Low' };
const data: Row[] = [
  { id: 'a', name: 'Dell 7490', qty: 5, status: 'In stock' },
  { id: 'b', name: 'HP 840', qty: 1, status: 'Low' },
  { id: 'c', name: 'Acer Swift', qty: 9, status: 'In stock' },
];
const columns: Column<Row>[] = [
  {
    id: 'name',
    header: 'Item',
    cell: (r) => <AvatarCell name={r.name} subtitle={r.id} />,
    sortValue: (r) => r.name,
  },
  { id: 'qty', header: 'Quantity', cell: (r) => r.qty, sortValue: (r) => r.qty, align: 'right' },
  {
    id: 'status',
    header: 'Status',
    cell: (r) => (
      <StatusBadge tone={r.status === 'Low' ? 'warning' : 'success'}>{r.status}</StatusBadge>
    ),
  },
];
const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('DataTable', () => {
  it('renders an accessible table with avatar first column and no axe violations', async () => {
    const { container } = render(
      <DataTable caption="Items" columns={columns} rows={data} rowKey={(r) => r.id} />,
    );
    expect(screen.getByRole('table', { name: 'Items' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'Items (scrollable)' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(await axe(container)).toHaveNoViolations();
  });
  it('sorts client-side: ascending, descending, then none, with aria-sort', () => {
    render(<DataTable caption="Items" columns={columns} rows={data} rowKey={(r) => r.id} />);
    const qty = screen.getByRole('columnheader', { name: /Quantity/ });
    expect(qty).toHaveAttribute('aria-sort', 'none');
    fireEvent.click(within(qty).getByRole('button'));
    expect(qty).toHaveAttribute('aria-sort', 'ascending');
    expect(names()[0]).toContain('HP 840');
    fireEvent.click(within(qty).getByRole('button'));
    expect(qty).toHaveAttribute('aria-sort', 'descending');
    expect(names()[0]).toContain('Acer Swift');
    fireEvent.click(within(qty).getByRole('button'));
    expect(qty).toHaveAttribute('aria-sort', 'none');
    expect(names()[0]).toContain('Dell 7490');
    expect(screen.getByRole('columnheader', { name: 'Status' })).not.toHaveAttribute('aria-sort');
  });
  it('lets the caller own the sort (server-side)', () => {
    const onSortChange = vi.fn();
    const sort: SortState = { id: 'qty', direction: 'desc' };
    render(
      <DataTable
        caption="Items"
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        sort={sort}
        onSortChange={onSortChange}
      />,
    );
    expect(names()[0]).toContain('Dell 7490'); // rows untouched
    fireEvent.click(
      within(screen.getByRole('columnheader', { name: /Quantity/ })).getByRole('button'),
    );
    expect(onSortChange).toHaveBeenCalledWith(null);
  });
  it('selects rows and all rows, tints selected rows, shows indeterminate', async () => {
    function Demo() {
      const [sel, setSel] = useState<Set<string>>(new Set());
      return (
        <>
          <DataTable
            caption="Items"
            columns={columns}
            rows={data}
            rowKey={(r) => r.id}
            rowLabel={(r) => r.name}
            selected={sel}
            onSelectedChange={setSel}
          />
          <BulkActionBar count={sel.size} onClear={() => setSel(new Set())}>
            <Button variant="secondary">Dispatch</Button>
          </BulkActionBar>
        </>
      );
    }
    const { container } = render(<Demo />);
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select HP 840' }));
    const row = screen.getByRole('row', { selected: true });
    expect(row.className).toContain('bg-primary-soft');
    expect(row.className).toContain('inset');
    expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toHaveProperty(
      'indeterminate',
      true,
    );
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toHaveTextContent('1 Selected');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(screen.getByText('3 Selected')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Select all rows' })).not.toBeChecked();
  });
  it('hides columns not in visibleColumns, driven by ColumnVisibilityMenu', async () => {
    function Demo() {
      const [vis, setVis] = useState(['name', 'qty', 'status']);
      return (
        <>
          <ColumnVisibilityMenu columns={columns} visible={vis} onChange={setVis} />
          <DataTable
            caption="Items"
            columns={columns}
            rows={data}
            rowKey={(r) => r.id}
            visibleColumns={vis}
          />
        </>
      );
    }
    const { container } = render(<Demo />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Quantity' }));
    expect(screen.queryByRole('columnheader', { name: /Quantity/ })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('shows skeleton rows while loading, with aria-busy', async () => {
    const { container } = render(
      <DataTable
        caption="Items"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        state="loading"
      />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });
  it('shows an error with retry, and an empty state', async () => {
    const onRetry = vi.fn();
    const { rerender, container } = render(
      <DataTable
        caption="Items"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        state="error"
        errorMessage="Server unreachable"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Server unreachable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
    rerender(
      <DataTable
        caption="Items"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        empty={<p>No items match</p>}
      />,
    );
    expect(screen.getByText('No items match')).toBeInTheDocument();
    rerender(<DataTable caption="Items" columns={columns} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
  });
  it('renders pagination when given', () => {
    render(
      <DataTable
        caption="Items"
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        pagination={{ page: 1, pageCount: 3, onPageChange: () => {} }}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
  it('has a sticky header by default', () => {
    render(<DataTable caption="Items" columns={columns} rows={data} rowKey={(r) => r.id} />);
    expect(document.querySelector('thead')?.className).toContain('sticky');
  });
});

describe('Pagination', () => {
  it('pageWindow keeps first, last and neighbours with gaps', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]);
  });
  it('navigates with first/prev/next/last, numbers, go-to-page and rows per page', async () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const { container } = render(
      <Pagination
        page={5}
        pageCount={10}
        onPageChange={onPageChange}
        pageSize={25}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenLastCalledWith(6);
    fireEvent.click(screen.getByRole('button', { name: 'Last' }));
    expect(onPageChange).toHaveBeenLastCalledWith(10);
    fireEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page');
    fireEvent.change(screen.getByLabelText('Go to page'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onPageChange).toHaveBeenLastCalledWith(7);
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
    expect(await axe(container)).toHaveNoViolations();
  });
  it('disables first/previous on page 1 and next/last on the last page', () => {
    const { rerender } = render(<Pagination page={1} pageCount={2} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    rerender(<Pagination page={2} pageCount={2} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

describe('Toolbar', () => {
  it('renders every control and reports interactions', async () => {
    const h = {
      filter: vi.fn(),
      exp: vi.fn(),
      primary: vi.fn(),
      sort: vi.fn(),
      view: vi.fn(),
      stats: vi.fn(),
      search: vi.fn(),
    };
    const { container } = render(
      <Toolbar
        search={{ label: 'Search items', value: '', onChange: h.search }}
        onFilter={h.filter}
        sort={{
          value: 'name',
          options: [
            { value: 'name', label: 'Name' },
            { value: 'qty', label: 'Quantity' },
          ],
          onChange: h.sort,
        }}
        onExport={h.exp}
        view={{
          label: 'View',
          value: 'list',
          options: [
            { value: 'list', label: 'List' },
            { value: 'grid', label: 'Grid' },
          ],
          onChange: h.view,
        }}
        statistics={{ checked: false, onChange: h.stats }}
        primary={{ label: 'Add item', onClick: h.primary }}
      />,
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'qty' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
    fireEvent.click(screen.getByRole('switch', { name: /Show Statistics/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    Object.values(h).forEach((f) => expect(f).toHaveBeenCalledTimes(1));
    expect(await axe(container)).toHaveNoViolations();
  });
  it('draws only what it is given', () => {
    render(<Toolbar onExport={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
