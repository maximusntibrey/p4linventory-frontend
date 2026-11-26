import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { meByRole } from '../mocks/data';
import { mockStore } from '../mocks/handlers';
import { server } from '../mocks/server';
import { apiError } from '../test/helpers';
import { renderApp } from '../test/renderApp';

describe('dashboard shell (F3.4)', () => {
  it('shows the server figures as big numbers and stock per location; axe clean', async () => {
    const { container } = renderApp('/', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    const waiting = (await screen.findByText('Waiting to be received')).parentElement!;
    expect(within(waiting).getByText('1')).toBeTruthy();
    expect(screen.getByText('In transit')).toBeTruthy();
    expect(screen.getByText('Active items')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Stock by location' })).toBeTruthy();
    expect(screen.getByText('12 on hand · 10 available')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('draws only what the server returns: no stock list for a role the API gave none, no cost', async () => {
    renderApp('/', { as: 'branch_admin' });
    await screen.findByText('Active items');
    expect(screen.queryByRole('heading', { name: 'Stock by location' })).toBeNull();
    expect(screen.queryByText(/cost/i)).toBeNull();
  });

  it('shows a notice, keeping the page, when the dashboard answers 403', async () => {
    server.use(http.get('/api/v1/dashboard/', () => apiError(403, 'permission_denied', 'No.')));
    renderApp('/', { as: 'super_admin' });
    expect((await screen.findByText(/not allowed to see this/)).getAttribute('role')).toBe('alert');
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
  });

  it('offers a retry when the dashboard cannot load', async () => {
    server.use(http.get('/api/v1/dashboard/', () => HttpResponse.error(), { once: true }));
    renderApp('/', { as: 'super_admin' });
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

describe('Home links are data-driven (v0.1.2 me.home_links)', () => {
  const tiles = () => within(screen.getByRole('main'));
  const tilesAsync = async () => within(await screen.findByRole('main'));

  it('Super Admin gets Activity, Sell, Find and Receive tiles that open permission-guarded pages', async () => {
    renderApp('/', { as: 'super_admin' });
    await screen.findByText('Active items');
    for (const [name, href] of [
      ['Activity', '/activity'],
      ['Sell', '/sell'],
      ['Find', '/find'],
      ['Receive', '/receive'],
      ['Sales', '/sell/sales'],
      ['Shortfalls', '/shortfalls'],
    ]) {
      expect(tiles().getByRole('link', { name }).getAttribute('href')).toBe(href);
    }
    fireEvent.click(tiles().getByRole('link', { name: 'Activity' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Activity' })).toBeTruthy();
  });

  it('Branch Admin gets Activity, Sales and Shortfalls tiles; Warehouse Admin gets Activity and Shortfalls', async () => {
    const ba = renderApp('/', { as: 'branch_admin' });
    await screen.findByText('Active items');
    expect(
      tiles()
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Activity', 'Shortfalls', 'Sales']);
    expect(tiles().getByRole('link', { name: 'Sales' }).getAttribute('href')).toBe('/sell/sales');
    ba.unmount();
    renderApp('/', { as: 'warehouse_admin' });
    await screen.findByText('Active items');
    expect(
      tiles()
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Activity', 'Shortfalls']);
  });

  it('renders only what me.home_links holds, and none when it is empty', async () => {
    server.use(
      http.get('/api/v1/auth/me/', () =>
        HttpResponse.json({
          ...meByRole.super_admin,
          home_links: [{ key: 'x', label: 'Only this', path: '/find' }],
        }),
      ),
    );
    renderApp('/', { as: 'super_admin' });
    expect(await (await tilesAsync()).findByRole('link', { name: 'Only this' })).toBeTruthy();
    expect(tiles().queryByRole('link', { name: 'Sell' })).toBeNull();
  });

  it('a tile whose permission the user lacks shows the 403 page', async () => {
    server.use(
      http.get('/api/v1/auth/me/', () =>
        HttpResponse.json({ ...meByRole.super_admin, permissions: ['dashboard.view'] }),
      ),
    );
    renderApp('/activity', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('no dashboard request or tiles when /me lacks dashboard.view', async () => {
    let called = 0;
    server.use(
      http.get('/api/v1/auth/me/', () =>
        HttpResponse.json({ ...meByRole.super_admin, permissions: [] }),
      ),
      http.get('/api/v1/dashboard/', () => {
        called++;
        return apiError(403, 'forbidden', 'No.');
      }),
    );
    renderApp('/', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByText('Active items')).toBeNull();
    expect(called).toBe(0);
  });
});

describe('dashboards (contract 0.5.0): big numbers, low stock, recent activity', () => {
  const lowRow = (location_id: number) => {
    const row = mockStore.stock.find((r) => r.location_id === location_id && r.item_id === 1)!;
    Object.assign(row, { reorder_level: 5, low_stock: true, available: 2 });
  };

  it('Super Admin: numbers, a low-stock list and the latest activity, newest first, no charts or cost', async () => {
    lowRow(2);
    const { container } = renderApp('/', { as: 'super_admin' });
    await screen.findByText('Active items');
    expect(await screen.findByRole('heading', { level: 2, name: 'Low stock' })).toBeTruthy();
    expect(screen.getByText('1 to reorder')).toBeTruthy();
    expect(screen.getByText(/Accra Branch: 2 available, reorder at 5/)).toBeTruthy();
    const recent = within(
      screen.getByRole('heading', { level: 2, name: 'Recent activity' }).parentElement!,
    );
    const items = recent.getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items[0].textContent).toContain('User created');
    expect(container.querySelector('canvas, svg[role="img"], img')).toBeNull();
    expect(screen.queryByText(/cost|GHS/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows at most 10 recent events and says so when nothing is low or recent', async () => {
    for (const r of mockStore.stock) r.low_stock = false;
    for (let i = 7; i <= 20; i++) mockStore.activity.push({ ...mockStore.activity[0], id: i });
    renderApp('/', { as: 'super_admin' });
    const heading = await screen.findByRole('heading', { level: 2, name: 'Recent activity' });
    expect(within(heading.parentElement!).getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('Nothing is at or below its reorder level.')).toBeTruthy();
  });

  it('Branch Admin sees only own-branch activity and own-branch low stock; Warehouse Admin the warehouse', async () => {
    lowRow(1);
    lowRow(2);
    const ba = renderApp('/', { as: 'branch_admin' });
    const heading = await screen.findByRole('heading', { level: 2, name: 'Recent activity' });
    expect(within(heading.parentElement!).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/Accra Branch: 2 available/)).toBeTruthy();
    expect(screen.queryByText(/Central Warehouse: 2 available/)).toBeNull();
    ba.unmount();
    renderApp('/', { as: 'warehouse_admin' });
    const h2 = await screen.findByRole('heading', { level: 2, name: 'Recent activity' });
    expect(within(h2.parentElement!).getAllByRole('listitem')).toHaveLength(3);
    expect(await screen.findByText(/Central Warehouse: 2 available/)).toBeTruthy();
  });

  it('Front Staff, who has no dashboard, is sent to the first menu entry', async () => {
    renderApp('/', { as: 'front_staff' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sell' })).toBeTruthy();
    expect(screen.queryByText('Recent activity')).toBeNull();
  });
});
