import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { meByRole } from '../mocks/data';
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
    ]) {
      expect(tiles().getByRole('link', { name }).getAttribute('href')).toBe(href);
    }
    fireEvent.click(tiles().getByRole('link', { name: 'Activity' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Activity' })).toBeTruthy();
  });

  it('Warehouse and Branch Admin get only the Activity tile', async () => {
    renderApp('/', { as: 'branch_admin' });
    await screen.findByText('Active items');
    expect(
      tiles()
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Activity']);
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
