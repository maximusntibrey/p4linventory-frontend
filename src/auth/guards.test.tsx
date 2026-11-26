import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { server } from '../mocks/server';
import { meByRole, type MockRole } from '../mocks/data';
import { mockSession } from '../mocks/handlers';
import { renderApp } from '../test/renderApp';

const where = () => screen.getByTestId('where').textContent;
const menuLabels = () =>
  within(screen.getByRole('navigation', { name: 'Main' }))
    .getAllByRole('link')
    .map((a) => a.textContent);

describe('route guards', () => {
  it('signed out: any app page goes to the login screen', async () => {
    renderApp('/items');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy();
    expect(where()).toBe('/login');
  });

  it('after signing in the user returns to the page they asked for', async () => {
    renderApp('/items');
    await screen.findByRole('heading', { name: 'Sign in' });
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'SA-0001' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Items' })).toBeTruthy();
    expect(where()).toBe('/items');
  });

  it('a page the server does not allow shows a clear 403 page', async () => {
    const { container } = renderApp('/users', { as: 'branch_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
    expect(screen.getByText(/not allowed to open this page/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a page the same user is allowed opens', async () => {
    renderApp('/stock', { as: 'branch_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Stock' })).toBeTruthy();
  });

  it('the sell screen follows the menu, since the contract has no sell permission', async () => {
    renderApp('/sell', { as: 'warehouse_admin' });
    expect(await screen.findByRole('heading', { name: '403: Not allowed' })).toBeTruthy();
  });

  it('a user who must change the one-time password is held on that screen', async () => {
    mockSession.loginId = 'USR-0004';
    mockSession.mustChange = true;
    renderApp('/items', { as: 'front_staff' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose a new password' }),
    ).toBeTruthy();
    expect(where()).toBe('/password-change');
  });

  it('the forced-change screen is closed to a user who has no change pending', async () => {
    renderApp('/password-change', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    expect(where()).toBe('/');
  });

  it('a server error while loading the session offers a retry', async () => {
    server.use(http.get('/api/v1/auth/me/', () => HttpResponse.error()));
    renderApp('/', { as: 'super_admin' });
    expect((await screen.findByRole('alert')).textContent).toContain('Could not reach the server.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

describe('menu comes from the me response', () => {
  it.each([
    ['super_admin', ['Home', 'Items', 'Warehouse', 'Branches', 'Users']],
    ['warehouse_admin', ['Home', 'Items', 'Receive stock', 'Dispatch', 'Find']],
    ['branch_admin', ['Home', 'Sell', 'Find', 'Stock', 'Receive']],
    ['front_staff', ['Sell', 'Find', 'Stock', 'Receive', 'Sales']],
  ] as [MockRole, string[]][])('%s mock session', async (role, labels) => {
    const { container } = renderApp(role === 'front_staff' ? '/stock' : '/', { as: role });
    await screen.findByRole('navigation', { name: 'Main' });
    expect(menuLabels()).toEqual(labels);
    expect(menuLabels().length).toBeLessThanOrEqual(5);
    expect(meByRole[role].menu.map((m) => m.label)).toEqual(labels);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('draws exactly what the server sends, whatever the role says', async () => {
    server.use(
      http.get('/api/v1/auth/me/', () =>
        HttpResponse.json({
          ...meByRole.super_admin,
          menu: [{ key: 'home', label: 'Home', path: '/' }],
        }),
      ),
    );
    renderApp('/', { as: 'super_admin' });
    await screen.findByRole('navigation', { name: 'Main' });
    expect(menuLabels()).toEqual(['Home']);
  });

  it('never draws more than 5 entries', async () => {
    const menu = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((k) => ({
      key: k,
      label: `Entry ${k}`,
      path: `/${k}`,
    }));
    server.use(
      http.get('/api/v1/auth/me/', () => HttpResponse.json({ ...meByRole.super_admin, menu })),
    );
    renderApp('/', { as: 'super_admin' });
    await screen.findByRole('navigation', { name: 'Main' });
    expect(menuLabels()).toHaveLength(5);
  });

  it('every nav entry shows its text label next to the icon', async () => {
    renderApp('/', { as: 'super_admin' });
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    for (const a of within(nav).getAllByRole('link')) {
      expect(a.textContent?.trim().length).toBeGreaterThan(0);
      expect(a.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
