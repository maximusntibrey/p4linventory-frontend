import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { users } from './mocks/data';
import { server } from './mocks/server';
import { apiError, capture, click, type, openProfile } from './test/helpers';
import { renderApp } from './test/renderApp';

const emptyPage = { count: 0, page: 1, page_size: 25, next: null, previous: null, results: [] };
const active = () => document.activeElement as HTMLElement;

describe('FIX-21 branch scope: nothing cached from the old branch survives', () => {
  it('a working-branch switch removes every non-/me query', async () => {
    const { client } = renderApp('/', { as: 'front_staff' });
    await openProfile();
    await screen.findByRole('button', { name: 'Switch working branch' });
    client.setQueryData(['stock', 'list'], [{ id: 1 }]);
    click('Switch working branch');
    await screen.findByRole('heading', { level: 1, name: 'Switch branch' });
    fireEvent.click(await screen.findByRole('button', { name: 'Kumasi Branch' }));
    await waitFor(() => expect(client.getQueryData(['stock', 'list'])).toBeUndefined());
    expect(client.getQueryData(['me'])).toBeTruthy();
  });

  it('the Super Admin filter change drops cached rows and shows Loading, never the old rows', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.get('/api/v1/users/', async ({ request }) => {
        if (new URL(request.url).searchParams.get('branch') !== '3') return undefined;
        await gate;
        return HttpResponse.json(emptyPage);
      }),
    );
    const { client } = renderApp('/users', { as: 'super_admin' });
    await screen.findByRole('link', { name: 'Kofi Boateng' });
    await screen.findByRole('option', { name: 'Kumasi Branch' });
    client.setQueryData(['stock', 'list'], [{ id: 1 }]);
    fireEvent.change(screen.getByLabelText('Filter by branch'), { target: { value: '3' } });
    expect(client.getQueryData(['stock', 'list'])).toBeUndefined();
    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Users' }).getAttribute('aria-busy')).toBe('true'),
    );
    expect(screen.queryByRole('link', { name: 'Kofi Boateng' })).toBeNull();
    release();
    expect(await screen.findByText('No users match')).toBeTruthy();
  });
});

describe('FIX-22 focus returns to the opener; a save moves focus to the notice', () => {
  it('ConfirmPanel Cancel gives focus back to the button that opened it', async () => {
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    const opener = screen.getByRole('button', { name: 'Suspend' });
    opener.focus();
    fireEvent.click(opener);
    const group = await screen.findByRole('group', { name: /Suspend Kofi/ });
    await waitFor(() => expect(active()).toBe(group));
    fireEvent.click(within(group).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(active()).toBe(opener));
  });

  it('a confirmed status change moves focus to the success notice', async () => {
    server.use(
      http.post('/api/v1/users/2/status/', () =>
        HttpResponse.json({ ...users[1], status: 'suspended' }),
      ),
    );
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    click('Suspend');
    fireEvent.click(
      within(await screen.findByRole('group', { name: /Suspend Kofi/ })).getByRole('button', {
        name: 'Yes, suspend',
      }),
    );
    await waitFor(() => expect(active().getAttribute('role')).toBe('status'));
    expect(active().textContent).toContain('Kofi Boateng is now suspended.');
  });

  it('"I have saved it" gives focus back to Reset password', async () => {
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    const opener = screen.getByRole('button', { name: 'Reset password' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(
      within(await screen.findByRole('group', { name: /Reset the password/ })).getByRole('button', {
        name: 'Yes, reset password',
      }),
    );
    const heading = await screen.findByRole('heading', { name: 'One-time password' });
    await waitFor(() => expect(active()).toBe(heading));
    click('I have saved it');
    await waitFor(() =>
      expect(active()).toBe(screen.getByRole('button', { name: 'Reset password' })),
    );
  });

  it('the branch form returns focus on Cancel and moves it to the notice on save', async () => {
    renderApp('/branches', { as: 'super_admin' });
    const opener = await screen.findByRole('button', { name: 'Edit Accra Branch' });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole('heading', { name: 'Edit Accra Branch' });
    click('Cancel');
    await waitFor(() =>
      expect(active()).toBe(screen.getByRole('button', { name: 'Edit Accra Branch' })),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit Accra Branch' }));
    await screen.findByRole('heading', { name: 'Edit Accra Branch' });
    click('Save branch');
    await waitFor(() => expect(active().getAttribute('role')).toBe('status'));
    expect(active().textContent).toContain('Branch saved.');
  });
});

describe('FIX-23 one idempotency key per action in UserDetail', () => {
  it('a failed PATCH retried after another action reuses its key', async () => {
    let calls = 0;
    const patch = capture('patch', '/api/v1/users/2/', () =>
      ++calls === 1 ? apiError(500, 'server_error', 'Try again.') : HttpResponse.json(users[1]),
    );
    server.use(
      patch.handler,
      http.post('/api/v1/users/2/status/', () =>
        HttpResponse.json({ ...users[1], status: 'suspended' }),
      ),
    );
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    await waitFor(() =>
      expect((screen.getByLabelText('Permanent location') as HTMLSelectElement).value).toBe('2'),
    );
    type('Full name', 'Kofi B. Boateng');
    click('Save changes');
    await screen.findByRole('alert');
    click('Suspend');
    fireEvent.click(
      within(await screen.findByRole('group', { name: /Suspend Kofi/ })).getByRole('button', {
        name: 'Yes, suspend',
      }),
    );
    await screen.findAllByText(/is now suspended/);
    click('Save changes');
    await waitFor(() => expect(patch.seen).toHaveLength(2));
    expect(patch.seen[1].key).toBe(patch.seen[0].key);
  });
});

describe('FIX-24 the branch-list query only runs in the all-branches view', () => {
  it('as Front Staff nothing asks for /branches/?kind=branch before the picker opens', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/branches/', ({ request }) => {
        seen.push(new URL(request.url).search);
        return undefined;
      }),
    );
    renderApp('/', { as: 'front_staff' });
    await openProfile();
    await screen.findByRole('button', { name: 'Switch working branch' });
    expect(seen.filter((s) => s.includes('kind=branch'))).toHaveLength(0);
    click('Switch working branch');
    await screen.findByRole('button', { name: /Accra Branch/ });
    expect(seen.filter((s) => s.includes('kind=branch')).length).toBeGreaterThan(0);
  });
});

describe('FIX-25 the users list returns to page 1 when the branch filter changes', () => {
  it('sends page=1 with the new branch', async () => {
    const seen: { page: string | null; branch: string | null }[] = [];
    server.use(
      http.get('/api/v1/users/', ({ request }) => {
        const p = new URL(request.url).searchParams;
        const page = Number(p.get('page') ?? 1);
        seen.push({ page: p.get('page'), branch: p.get('branch') });
        return HttpResponse.json({
          ...emptyPage,
          count: 60,
          page,
          results: [users[1]],
          next: page < 3 ? 'n' : null,
          previous: page > 1 ? 'p' : null,
        });
      }),
    );
    renderApp('/users', { as: 'super_admin' });
    await screen.findByRole('link', { name: 'Kofi Boateng' });
    await screen.findByRole('option', { name: 'Kumasi Branch' });
    click('Next');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Page 2' }).getAttribute('aria-current')).toBe(
        'page',
      ),
    );
    fireEvent.change(screen.getByLabelText('Filter by branch'), { target: { value: '3' } });
    await waitFor(() => expect(seen.some((s) => s.branch === '3')).toBe(true));
    expect(seen.filter((s) => s.branch === '3').every((s) => s.page === '1')).toBe(true);
  });
});
