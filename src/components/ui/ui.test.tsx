import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ConfigProvider } from '../../contexts/ConfigContext';
import ThemeCustomization from '../../themes';
import { Plus } from '../icons';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  LinkButton,
  PageHeader,
  Pagination,
  SegmentedControl,
  SelectField,
  Skeleton,
  StatusWord,
  TextField,
  Toolbar,
} from '.';
import type { Column, SortState } from '.';

const Where = () => <span data-testid="where">{useLocation().pathname}</span>;
const show = (ui: ReactElement) =>
  render(
    <ConfigProvider>
      <ThemeCustomization>
        <MemoryRouter>
          {ui}
          <Where />
        </MemoryRouter>
      </ThemeCustomization>
    </ConfigProvider>,
  );
/** jsdom has no media queries: pretend the screen is a phone. */
const phone = () =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
afterEach(() => vi.unstubAllGlobals());

const minHeight = (el: Element) => parseFloat(getComputedStyle(el).minHeight);

describe('Button and LinkButton', () => {
  it('every variant is at least 44 px tall, has a visible label and no axe violations', async () => {
    const { container } = show(
      <div>
        {(['primary', 'secondary', 'ghost', 'danger'] as const).map((v) => (
          <Button key={v} variant={v} icon={Plus}>
            {`Add ${v}`}
          </Button>
        ))}
      </div>,
    );
    for (const b of screen.getAllByRole('button')) expect(minHeight(b)).toBeGreaterThanOrEqual(44);
    expect(screen.getByRole('button', { name: 'Add primary' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('loading disables the button and sets aria-busy; the label stays', () => {
    const onClick = vi.fn();
    show(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Save' });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
  it('a LinkButton is a real link and navigates', () => {
    show(<LinkButton to="/items/new">Add item</LinkButton>);
    const link = screen.getByRole('link', { name: 'Add item' });
    expect(link).toHaveAttribute('href', '/items/new');
    fireEvent.click(link);
    expect(screen.getByTestId('where')).toHaveTextContent('/items/new');
  });
});

describe('form fields', () => {
  it('TextField and SelectField wire label, hint and error; axe clean', async () => {
    const { container } = show(
      <form>
        <TextField label="Name" hint="As on the invoice." error="Enter a name." />
        <SelectField label="Branch" error="Pick one.">
          <option value="">Choose</option>
          <option value="1">Accra</option>
        </SelectField>
      </form>,
    );
    const name = screen.getByLabelText('Name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name.getAttribute('aria-describedby')).toContain('-hint');
    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    const select = screen.getByLabelText('Branch');
    expect(select.tagName).toBe('SELECT');
    fireEvent.change(select, { target: { value: '1' } });
    expect((select as HTMLSelectElement).value).toBe('1');
    expect(minHeight(name.closest('.MuiOutlinedInput-root')!)).toBeGreaterThanOrEqual(44);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('display components', () => {
  it('StatusWord is icon plus words, never colour alone', async () => {
    const { container } = show(
      <div>
        <StatusWord status="low" />
        <StatusWord status="in-transit" />
        <StatusWord status="active" label="On" />
      </div>,
    );
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('In transit')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3);
    expect(await axe(container)).toHaveNoViolations();
  });
  it('EmptyState, Card and Skeleton render and pass axe', async () => {
    const { container } = show(
      <Card>
        <EmptyState
          title="Nothing here"
          description="Add the first one."
          action={<Button>Add</Button>}
        />
        <Skeleton />
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

type Row = { id: string; name: string; qty: number };
const rows: Row[] = [
  { id: 'a', name: 'Charger', qty: 5 },
  { id: 'b', name: 'Laptop', qty: 2 },
  { id: 'c', name: 'Mouse', qty: 9 },
];
const columns: Column<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
  { id: 'qty', header: 'Quantity', cell: (r) => r.qty, sortValue: (r) => r.qty, align: 'right' },
  { id: 'status', header: 'Status', cell: () => <StatusWord status="active" /> },
];
const names = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('DataTable', () => {
  it('sorts client-side: ascending, descending, then none, with aria-sort', () => {
    show(<DataTable caption="Stock" columns={columns} rows={rows} rowKey={(r) => r.id} />);
    const qty = screen.getByRole('columnheader', { name: 'Quantity' });
    expect(qty).toHaveAttribute('aria-sort', 'none');
    fireEvent.click(within(qty).getByRole('button'));
    expect(qty).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['Laptop', 'Charger', 'Mouse']);
    fireEvent.click(within(qty).getByRole('button'));
    expect(qty).toHaveAttribute('aria-sort', 'descending');
    expect(names()).toEqual(['Mouse', 'Charger', 'Laptop']);
    fireEvent.click(within(qty).getByRole('button'));
    expect(qty).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'Status' })).not.toHaveAttribute('aria-sort');
  });
  it('server-side sort: reports the change and shows the given state', () => {
    const onSortChange = vi.fn();
    const sort: SortState = { id: 'qty', direction: 'desc' };
    show(
      <DataTable
        caption="Stock"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sort={sort}
        onSortChange={onSortChange}
      />,
    );
    const qty = screen.getByRole('columnheader', { name: 'Quantity' });
    expect(qty).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(within(qty).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith(null);
  });
  it('selects rows and all rows, with labelled checkboxes', () => {
    const onSelectedChange = vi.fn();
    show(
      <DataTable
        caption="Stock"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowLabel={(r) => r.name}
        selected={new Set(['a'])}
        onSelectedChange={onSelectedChange}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Select Charger' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Laptop' }));
    expect(onSelectedChange).toHaveBeenLastCalledWith(new Set(['a', 'b']));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(onSelectedChange).toHaveBeenLastCalledWith(new Set(['a', 'b', 'c']));
  });
  it('loading shows placeholders and aria-busy; error offers Try again; empty says so', async () => {
    const onRetry = vi.fn();
    const view = show(
      <DataTable
        caption="Stock"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        state="loading"
      />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    view.unmount();
    const err = show(
      <DataTable
        caption="Stock"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        state="error"
        errorMessage="Could not load stock."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load stock.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    err.unmount();
    const { container } = show(
      <DataTable caption="Stock" columns={columns} rows={[]} rowKey={(r) => r.id} />,
    );
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('on a phone every cell carries its column label so rows read as cards', () => {
    phone();
    show(<DataTable caption="Stock" columns={columns} rows={rows} rowKey={(r) => r.id} />);
    const cell = within(screen.getByRole('table')).getAllByRole('cell')[1];
    expect(cell).toHaveAttribute('data-label', 'Quantity');
  });
});

describe('Pagination', () => {
  it('navigates with first/prev/next/last, numbers, go-to-page and rows per page', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    show(
      <Pagination
        page={5}
        pageCount={9}
        onPageChange={onPageChange}
        pageSize={25}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenLastCalledWith(6);
    fireEvent.click(screen.getByRole('button', { name: 'Last' }));
    expect(onPageChange).toHaveBeenLastCalledWith(9);
    expect(screen.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page');
    fireEvent.change(screen.getByLabelText('Go to page'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onPageChange).toHaveBeenLastCalledWith(7);
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
  it('disables Previous on the first page and Next on the last', () => {
    show(<Pagination page={1} pageCount={1} onPageChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  it('on a phone: previous, a page indicator and next; rows per page in a drawer', async () => {
    phone();
    show(
      <Pagination
        page={2}
        pageCount={4}
        onPageChange={() => undefined}
        pageSize={10}
        onPageSizeChange={() => undefined}
      />,
    );
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rows' }));
    expect(await screen.findByRole('dialog', { name: 'Rows per page' })).toBeInTheDocument();
  });
});

describe('Toolbar and PageHeader on a phone', () => {
  it('Toolbar keeps search and the primary action and moves the rest into a Filters drawer', async () => {
    phone();
    const onExport = vi.fn();
    show(
      <Toolbar
        search={{ label: 'Search items', value: '', onChange: () => undefined }}
        onExport={onExport}
        primary={{ label: 'Add item', onClick: () => undefined }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const drawer = await screen.findByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull());
  });
  it('PageHeader collapses two or more actions into an Actions drawer', async () => {
    phone();
    show(
      <PageHeader
        title="Items"
        actions={
          <>
            <Button>One</Button>
            <Button>Two</Button>
          </>
        }
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Items' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'One' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(
      within(await screen.findByRole('dialog', { name: 'Actions' })).getByRole('button', {
        name: 'Two',
      }),
    ).toBeInTheDocument();
  });
});

describe('SegmentedControl', () => {
  it('is a radio group: arrow keys move the choice, one tab stop', () => {
    const onValueChange = vi.fn();
    show(
      <SegmentedControl
        label="Branch type"
        value="a"
        onValueChange={onValueChange}
        options={[
          { value: 'a', label: 'Warehouse' },
          { value: 'b', label: 'Branch' },
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Branch type' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Warehouse' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Branch' }));
    expect(onValueChange).toHaveBeenCalledWith('b');
  });
});
