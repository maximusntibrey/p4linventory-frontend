import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { stock } from '../../mocks/data';
import { server } from '../../mocks/server';
import { apiError, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const h1 = () => screen.findByRole('heading', { level: 1, name: 'Stock' });
const section = (name: string) =>
  screen.getByRole('heading', { level: 2, name }).closest('section')!;

describe('stock screen', () => {
  it('groups the balances by location with the four quantities and a stock word + icon; axe clean', async () => {
    const { container } = renderApp('/stock', { as: 'super_admin' });
    await h1();
    await screen.findByRole('heading', { level: 2, name: 'Central Warehouse' });
    const wh = within(section('Central Warehouse'));
    expect(wh.getByText('HP 250 G9')).toBeTruthy();
    expect(wh.getByText('SKU-000001')).toBeTruthy();
    expect(wh.getByText('In stock')).toBeTruthy();
    expect(wh.getByText('On hand').nextElementSibling?.textContent).toBe('12');
    expect(wh.getByText('Available').nextElementSibling?.textContent).toBe('10');
    expect(wh.getByText('Reserved').nextElementSibling?.textContent).toBe('2');
    expect(wh.getByText('Quarantined').nextElementSibling?.textContent).toBe('0');
    // low_stock is the server's call: Accra is flagged, the warehouse (also with a level) is not
    const accra = within(section('Accra Branch'));
    expect(accra.getByText('Low')).toBeTruthy();
    expect(accra.queryByText('In stock')).toBeNull();
    expect(wh.queryByText('Low')).toBeNull();
    const kumasi = within(section('Kumasi Branch'));
    expect(kumasi.getByText('Out of stock')).toBeTruthy();
    expect(section('Kumasi Branch').querySelector('svg')).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the Low flag follows the API, not the numbers: low_stock false stays In stock; zero available is Out of stock', async () => {
    server.use(
      http.get('/api/v1/stock/', () =>
        HttpResponse.json({
          count: 2,
          page: 1,
          page_size: 25,
          next: null,
          previous: null,
          results: [
            { ...stock[0], available: 1, reorder_level: 5, low_stock: false },
            { ...stock[1], available: 0, reorder_level: 5, low_stock: true },
          ],
        }),
      ),
    );
    renderApp('/stock', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 2, name: 'Central Warehouse' });
    expect(within(section('Central Warehouse')).getByText('In stock')).toBeTruthy();
    expect(within(section('Accra Branch')).getByText('Out of stock')).toBeTruthy();
    expect(screen.queryByText('Low')).toBeNull();
    expect(screen.getAllByText('Reorder level: 5')).toHaveLength(2);
  });

  it('search and location are sent to the API', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/stock/', ({ request }) => {
        seen.push(new URL(request.url).search);
      }),
    );
    renderApp('/stock', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 2, name: 'Accra Branch' });
    await waitFor(() =>
      expect(
        within(screen.getByLabelText('Location')).getByRole('option', { name: 'Kumasi Branch' }),
      ).toBeTruthy(),
    );
    type('Location', '3');
    click('Search');
    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 2, name: 'Accra Branch' })).toBeNull(),
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Kumasi Branch' })).toBeTruthy();
    expect(seen.some((s) => s.includes('location_id=3'))).toBe(true);

    type('Search by item name or SKU', 'no-such-item');
    click('Search');
    expect(await screen.findByText('No stock matches.')).toBeTruthy();
    expect(seen.some((s) => s.includes('q=no-such-item'))).toBe(true);
  });

  it('a branch user sees only their branch and no location choice', async () => {
    renderApp('/stock', { as: 'front_staff' });
    await h1();
    expect(await screen.findByRole('heading', { level: 2, name: 'Accra Branch' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2, name: 'Central Warehouse' })).toBeNull();
    expect(screen.queryByLabelText('Location')).toBeNull();
  });

  it('when the API refuses a location (403) the 403 page is shown', async () => {
    renderApp('/stock', { as: 'branch_admin' });
    await h1();
    await waitFor(() =>
      expect(
        within(screen.getByLabelText('Location')).getByRole('option', { name: 'Kumasi Branch' }),
      ).toBeTruthy(),
    );
    type('Location', '3');
    click('Search');
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('shows no cost, whatever role', async () => {
    renderApp('/stock', { as: 'super_admin' });
    await h1();
    await screen.findByRole('heading', { level: 2, name: 'Central Warehouse' });
    expect(screen.queryByText(/cost/i)).toBeNull();
    expect(screen.queryByText(/900/)).toBeNull();
  });

  it('pages through the API envelope', async () => {
    const asked: (string | null)[] = [];
    server.use(
      http.get('/api/v1/stock/', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');
        asked.push(page);
        return HttpResponse.json({
          count: 2,
          page: Number(page ?? 1),
          page_size: 1,
          next: page === '2' ? null : '?page=2',
          previous: page === '2' ? '?page=1' : null,
          results: [stock[page === '2' ? 2 : 0]],
        });
      }),
    );
    renderApp('/stock', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 2, name: 'Central Warehouse' });
    click('Next');
    expect(await screen.findByRole('heading', { level: 2, name: 'Kumasi Branch' })).toBeTruthy();
    expect(asked).toContain('2');
  });

  it('a failing request says so and retries', async () => {
    let fail = true;
    server.use(
      http.get('/api/v1/stock/', () =>
        fail ? apiError(500, 'server_error', 'The server had a problem.') : undefined,
      ),
    );
    renderApp('/stock', { as: 'super_admin' });
    expect(await screen.findByText('The server had a problem.')).toBeTruthy();
    fail = false;
    click('Try again');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Central Warehouse' }),
    ).toBeTruthy();
  });
});
