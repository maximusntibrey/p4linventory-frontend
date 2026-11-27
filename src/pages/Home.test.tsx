import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { meByRole } from '../mocks/data';
import { mockStore } from '../mocks/handlers';
import { server } from '../mocks/server';
import { apiError } from '../test/helpers';
import { renderApp } from '../test/renderApp';

const card = (title: string) => screen.getByText(title).closest('.MuiPaper-root') as HTMLElement;
const lowRow = (location_id: number) => {
  const row = mockStore.stock.find((r) => r.location_id === location_id && r.item_id === 1)!;
  Object.assign(row, { reorder_level: 5, low_stock: true, available: 2 });
};

describe('dashboard cards (Mantis stat, chart and list cards)', () => {
  it('Super Admin: stat cards show the server figures; axe clean', async () => {
    const { container } = renderApp('/', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    await screen.findByText('Waiting receipts');
    await waitFor(() => expect(within(card('Waiting receipts')).getByText('1')).toBeTruthy());
    expect(within(card('Units in stock')).getByText('15')).toBeTruthy();
    for (const t of ['Low stock items', "Today's sales", 'Open shortfalls', 'In transit']) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('Stock by location')).toBeTruthy();
    expect(screen.getByText('Quick actions')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a card with no backend data says "Not available yet" and shows no numbers', async () => {
    renderApp('/', { as: 'super_admin' });
    await screen.findByText('Stock value at cost');
    for (const t of [
      'Stock value at cost',
      'Items without a selling price',
      'Top selling items',
      'Cancelled sales today',
    ]) {
      const c = card(t);
      expect(within(c).getByText('Not available yet')).toBeTruthy();
      expect(within(c).getByText(/Coming soon/)).toBeTruthy();
      expect(c.textContent).not.toMatch(/\d/);
    }
  });

  it('Branch Admin: no stock-by-location card (the API gave none) and no cost card', async () => {
    renderApp('/', { as: 'branch_admin' });
    await screen.findByText('Waiting receipts');
    expect(screen.queryByText('Stock by location')).toBeNull();
    expect(screen.queryByText('Stock value at cost')).toBeNull();
    expect(screen.queryByText('Units in stock')).toBeNull();
    expect(screen.getByText('Open shortfalls')).toBeTruthy();
  });

  it('Warehouse Admin: warehouse cards, quick links only for what the server allows (no Sell)', async () => {
    renderApp('/', { as: 'warehouse_admin' });
    await screen.findByText('Low stock items');
    expect(screen.getByText('Recent dispatches')).toBeTruthy();
    expect(screen.queryByText("Today's sales")).toBeNull();
    const quick = card('Quick actions');
    expect(within(quick).queryByRole('link', { name: 'Sell' })).toBeNull();
    expect(within(quick).getByRole('link', { name: 'New dispatch' })).toBeTruthy();
  });

  it('low stock list shows a row, or says nothing is low', async () => {
    lowRow(2);
    const first = renderApp('/', { as: 'super_admin' });
    expect(await screen.findByText(/at Accra Branch/)).toBeTruthy();
    expect(screen.getByText('2 of 5')).toBeTruthy();
    first.unmount();
    for (const r of mockStore.stock) r.low_stock = false;
    renderApp('/', { as: 'super_admin' });
    expect(await screen.findByText('Nothing is at or below its reorder level.')).toBeTruthy();
  });

  it('a card says so, keeping the page, when the dashboard answers 403', async () => {
    server.use(http.get('/api/v1/dashboard/', () => apiError(403, 'permission_denied', 'No.')));
    renderApp('/', { as: 'super_admin' });
    expect(
      (await screen.findAllByText('Not allowed for your account.'))[0].closest('[role="alert"]'),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
  });

  it('offers a retry when the dashboard cannot load, and shows a loading state first', async () => {
    server.use(http.get('/api/v1/dashboard/', () => HttpResponse.error(), { once: true }));
    renderApp('/', { as: 'super_admin' });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    const retry = (await screen.findAllByRole('button', { name: 'Try again' }))[0];
    fireEvent.click(retry);
    await waitFor(() => expect(within(card('Waiting receipts')).getByText('1')).toBeTruthy());
  });

  it('no dashboard request and no dashboard cards when /me lacks dashboard.view', async () => {
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
    expect(screen.queryByText('Low stock items')).toBeNull();
    expect(called).toBe(0);
  });

  it('Front Staff, who has no dashboard, is sent to the first menu entry', async () => {
    renderApp('/', { as: 'front_staff' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sell' })).toBeTruthy();
  });
});
