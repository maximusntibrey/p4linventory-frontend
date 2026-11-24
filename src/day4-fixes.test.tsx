import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { items, meByRole, stock } from './mocks/data';
import { server } from './mocks/server';
import { apiError, click, type } from './test/helpers';
import { renderApp } from './test/renderApp';

/** Manage items, no cost and no prices. */
const noCostNoPrice = () =>
  server.use(
    http.get('/api/v1/auth/me/', () =>
      HttpResponse.json({
        ...meByRole.super_admin,
        permissions: meByRole.super_admin.permissions.filter(
          (p) => p !== 'items.view_cost' && p !== 'prices.manage',
        ),
      }),
    ),
  );

describe('FIX-28 cost never appears for a user without items.view_cost', () => {
  it('a save, an activation and an upload answered with average_cost do not show or cache it', async () => {
    noCostNoPrice();
    const leak = (extra: object = {}) =>
      HttpResponse.json({ ...items[1], average_cost: '777.00', warnings: [], ...extra });
    server.use(
      http.patch('/api/v1/items/:id/', () => leak()),
      http.post('/api/v1/items/:id/status/', () => leak({ status: 'active' })),
      http.put('/api/v1/items/:id/image/', () => leak({ image_url: '/media/x.png' })),
    );
    const { client } = renderApp('/items/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Dell 65W charger' });
    await screen.findByLabelText('Wattage (W)');
    type('Wattage (W)', '65');
    click('Save changes');
    expect(await screen.findByText('Changes saved.')).toBeTruthy();
    click('Activate item');
    expect(await screen.findByText('Dell 65W charger is now Active.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Add a picture'), {
      target: { files: [new File([new ArrayBuffer(5)], 'a.png', { type: 'image/png' })] },
    });
    click('Upload picture');
    expect(await screen.findByText('Picture saved.')).toBeTruthy();
    expect(screen.queryByText(/Average cost/)).toBeNull();
    expect(screen.queryByText(/777/)).toBeNull();
    expect(JSON.stringify(client.getQueryData(['items', 'one', 2, false]))).not.toContain(
      'average_cost',
    );
  });

  it('the list shows cost only when the user may see it, even if a row carries it', async () => {
    noCostNoPrice();
    server.use(
      http.get('/api/v1/items/', () =>
        HttpResponse.json({
          count: 1,
          page: 1,
          page_size: 25,
          next: null,
          previous: null,
          results: [{ ...items[0], average_cost: '777.00' }],
        }),
      ),
    );
    renderApp('/items', { as: 'super_admin' });
    await screen.findByRole('link', { name: 'HP 250 G9' });
    expect(screen.queryByText(/Average cost/)).toBeNull();
  });
});

describe('FIX-29 the price is built from the typed text', () => {
  it('a very long price keeps every digit', async () => {
    const seen: unknown[] = [];
    server.use(
      http.post('/api/v1/items/', async ({ request }) => {
        seen.push(await request.clone().json());
      }),
    );
    renderApp('/items/new', { as: 'super_admin' });
    await screen.findByRole('option', { name: 'Laptop' });
    await screen.findByRole('option', { name: 'Dell' });
    type('Name', 'X');
    type('Category', '1');
    await screen.findByRole('option', { name: 'Business laptop' });
    type('Type', '1');
    type('Brand', '1');
    type('Model', 'M');
    type('Part number (MPN)', 'P');
    type('Condition', 'new');
    type('Selling price (GHS)', '12345678901234567.5');
    click('Save as Draft');
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toMatchObject({ selling_price: '12345678901234567.50' });
  });

  it('on edit, an item with a price says it cannot be removed, and clearing the box keeps it', async () => {
    const seen: unknown[] = [];
    server.use(
      http.patch('/api/v1/items/:id/', async ({ request }) => {
        seen.push(await request.clone().json());
      }),
    );
    renderApp('/items/1', { as: 'super_admin' });
    const price = await screen.findByLabelText('Selling price (GHS)');
    await screen.findByLabelText('RAM (GB)');
    fireEvent.change(price, { target: { value: '' } });
    expect(screen.getByText(/can be changed but not removed/)).toBeTruthy();
    click('Save changes');
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).not.toHaveProperty('selling_price');
  });
});

describe('FIX-31 a sign-in that does not hold', () => {
  async function signIn() {
    renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    type('Login ID', 'SA-0001');
    type('Password', 'a-good-password');
    click('Sign in');
  }

  it('/me answering 401 right after sign-in keeps the user on the sign-in screen with a message', async () => {
    server.use(
      http.post('/api/v1/auth/login/', () => HttpResponse.json(meByRole.super_admin)),
      http.get('/api/v1/auth/me/', () => apiError(401, 'not_authenticated', 'Log in to continue.')),
    );
    await signIn();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Your sign-in did not hold, try again.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
  });

  it('a server error on /me after sign-in falls back to the sign-in answer', async () => {
    let first = true;
    server.use(
      http.post('/api/v1/auth/login/', () => {
        return HttpResponse.json(meByRole.super_admin);
      }),
      http.get('/api/v1/auth/me/', () => {
        if (first) {
          first = false;
          return apiError(401, 'not_authenticated', 'Log in to continue.');
        }
        return apiError(500, 'server_error', 'Boom.');
      }),
    );
    await signIn();
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
  });
});

describe('FIX-32 stock groups by location id', () => {
  it('two locations with the same name stay two sections', async () => {
    server.use(
      http.get('/api/v1/stock/', () =>
        HttpResponse.json({
          count: 2,
          page: 1,
          page_size: 25,
          next: null,
          previous: null,
          results: [
            { ...stock[0], location_id: 5, location_name: 'Main Branch' },
            { ...stock[0], location_id: 6, location_name: 'Main Branch', on_hand: 1, available: 1 },
          ],
        }),
      ),
    );
    renderApp('/stock', { as: 'super_admin' });
    const heads = await screen.findAllByRole('heading', { level: 2, name: 'Main Branch' });
    expect(heads).toHaveLength(2);
    expect(heads[0].closest('section')).not.toBe(heads[1].closest('section'));
  });
});
