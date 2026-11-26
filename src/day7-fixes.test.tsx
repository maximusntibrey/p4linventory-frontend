import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { meByRole } from './mocks/data';
import { mockStore } from './mocks/handlers';
import { server } from './mocks/server';
import { capture, click, type } from './test/helpers';
import { renderApp } from './test/renderApp';

describe('FIX-47 mock /me home_links match contract 0.5.2 per role', () => {
  it('SA, WA, BA and FS get exactly the published tiles, in order', () => {
    const labels = (r: keyof typeof meByRole) => meByRole[r].home_links.map((l) => l.label);
    expect(labels('super_admin')).toEqual([
      'Activity',
      'Shortfalls',
      'Sell',
      'Find',
      'Receive',
      'Sales',
    ]);
    expect(labels('warehouse_admin')).toEqual(['Activity', 'Shortfalls']);
    expect(labels('branch_admin')).toEqual(['Activity', 'Shortfalls', 'Sales']);
    expect(labels('front_staff')).toEqual([]);
    for (const r of Object.values(meByRole)) expect(r.menu.length).toBeLessThanOrEqual(5);
  });
});

describe('FIX-48 shortfall quantity above what remains is refused in the form', () => {
  it('remaining + 1 shows an error on Quantity and sends no POST', async () => {
    const sent = capture('post', '/api/v1/shortfalls/4/resolve/', () => HttpResponse.json({}));
    server.use(sent.handler);
    renderApp('/shortfalls', { as: 'super_admin' });
    fireEvent.click(await screen.findByRole('button', { name: /Resolve shortfall of HP 250 G9/ }));
    type('Resolution', 'confirm_loss');
    type('Quantity', '3');
    type('Note', 'x');
    click('Confirm resolution');
    expect(await screen.findByText('More than the 2 still open.')).toBeTruthy();
    expect(sent.seen).toHaveLength(0);
  });
});

describe('FIX-49 activity: a backwards date range is blocked before any request', () => {
  it('From date after To date shows an error on To date and makes no new request', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/activity-log/', ({ request }) => {
        seen.push(request.url);
        return undefined;
      }),
    );
    renderApp('/activity', { as: 'super_admin' });
    await screen.findByText(/User created/);
    const before = seen.length;
    type('From date', '2026-11-24');
    type('To date', '2026-11-23');
    click('Apply filters');
    const msg = await screen.findByText('The end date is before the start date.');
    expect(screen.getByLabelText('To date').getAttribute('aria-invalid')).toBe('true');
    expect(msg).toBeTruthy();
    expect(seen).toHaveLength(before);
    type('To date', '2026-11-24');
    click('Apply filters');
    await waitFor(() => expect(seen.length).toBe(before + 1));
  });
});

describe('FIX-50 dashboard says when the low-stock list is cut', () => {
  it('shows "Showing 10 of N" only when the count is above the rows', async () => {
    // Seed 12 low rows in the mock store, so the real mock handler returns 10 rows and a count of 12.
    const base = mockStore.stock[1];
    for (let i = 0; i < 11; i++)
      mockStore.stock.push({ ...base, item_id: 100 + i, sku: `S-${i}`, item_name: `Item ${i}` });
    renderApp('/', { as: 'super_admin' });
    expect(await screen.findByText('Showing 10 of 12')).toBeTruthy();
    expect(
      within(
        screen.getByRole('heading', { level: 2, name: 'Low stock' }).parentElement!,
      ).getAllByRole('listitem').length,
    ).toBe(10);
  });

  it('is not shown when every low row is listed', async () => {
    renderApp('/', { as: 'super_admin' });
    await screen.findByText('1 to reorder');
    expect(screen.queryByText(/Showing/)).toBeNull();
  });
});
