import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { meKey } from '../../auth/session';
import { branchB, dashboard, meByRole } from '../../mocks/data';
import { mockSession } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { apiError, capture, click } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const banner = () => within(screen.getAllByRole('banner')[0]);

describe('working branch: first pick', () => {
  it('a user whose /me has no branch and allows picking gets the picker, with no way around it', async () => {
    mockSession.workingBranch = null;
    const { container } = renderApp('/', { as: 'front_staff' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose your branch' }),
    ).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Accra Branch' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Kumasi Branch' })).toBeTruthy();
    // The warehouse is a location, not a branch to work at.
    expect(screen.queryByRole('button', { name: 'Central Warehouse' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(banner().getByText('No branch selected')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('choosing a branch sends the key, shows it in the top bar and opens the app', async () => {
    mockSession.workingBranch = null;
    const put = capture('put', '/api/v1/working-branch/', () =>
      HttpResponse.json({ ...meByRole.front_staff, working_branch: branchB }),
    );
    server.use(put.handler);
    renderApp('/', { as: 'front_staff' });
    await screen.findByRole('heading', { name: 'Choose your branch' });
    fireEvent.click(await screen.findByRole('button', { name: 'Kumasi Branch' }));
    await waitFor(() => expect(banner().getByText('Kumasi Branch')).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Choose your branch' })).toBeNull();
    expect(put.seen).toHaveLength(1);
    expect(put.seen[0].key).toMatch(/^[0-9a-f-]{36}$/);
    expect(put.seen[0].body).toEqual({ branch_id: 3 });
  });

  it('a user the API does not let pick is never shown the picker', async () => {
    mockSession.workingBranch = null;
    renderApp('/', { as: 'branch_admin' });
    await screen.findByRole('navigation', { name: 'Main' });
    expect(screen.queryByRole('heading', { name: 'Choose your branch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Switch branch' })).toBeNull();
  });

  it('shows what the API rejects and stays on the picker', async () => {
    mockSession.workingBranch = null;
    server.use(
      capture('put', '/api/v1/working-branch/', () =>
        apiError(409, 'conflict', 'That branch was just deactivated.'),
      ).handler,
    );
    renderApp('/', { as: 'front_staff' });
    await screen.findByRole('heading', { name: 'Choose your branch' });
    fireEvent.click(await screen.findByRole('button', { name: 'Kumasi Branch' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'That branch was just deactivated.',
    );
    expect(screen.getByRole('heading', { name: 'Choose your branch' })).toBeTruthy();
  });
});

describe('working branch: switching', () => {
  it('Switch branch has a visible label, opens the picker with Cancel, and Cancel returns', async () => {
    renderApp('/', { as: 'front_staff' });
    const open = await screen.findByRole('button', { name: 'Switch branch' });
    expect(open.textContent).toBe('Switch branch');
    click('Switch branch');
    expect(await screen.findByRole('heading', { level: 1, name: 'Switch branch' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: /Accra Branch \(current\)/ })).toBeTruthy();
    click('Cancel');
    expect(screen.queryByRole('heading', { level: 1, name: 'Switch branch' })).toBeNull();
  });

  it('a switch replaces /me and drops the branch-scoped queries, not /me itself', async () => {
    const { client } = renderApp('/', { as: 'front_staff' });
    await screen.findByRole('button', { name: 'Switch branch' });
    client.setQueryData(['stock', 'list'], [{ id: 1 }]);
    click('Switch branch');
    await screen.findByRole('heading', { level: 1, name: 'Switch branch' });
    fireEvent.click(await screen.findByRole('button', { name: 'Kumasi Branch' }));
    await waitFor(() => expect(banner().getByText('Kumasi Branch')).toBeTruthy());
    expect(client.getQueryData(['stock', 'list'])).toBeUndefined();
    expect(client.getQueryState(meKey)?.isInvalidated).toBe(false);
  });

  it('when the API answers 403 the user is told and nothing changes', async () => {
    server.use(
      capture('put', '/api/v1/working-branch/', () =>
        apiError(403, 'permission_denied', 'You cannot change branch.'),
      ).handler,
    );
    renderApp('/', { as: 'front_staff' });
    await screen.findByRole('button', { name: 'Switch branch' });
    click('Switch branch');
    await screen.findByRole('heading', { level: 1, name: 'Switch branch' });
    fireEvent.click(await screen.findByRole('button', { name: 'Kumasi Branch' }));
    expect((await screen.findByRole('alert')).textContent).toContain('You cannot change branch.');
    expect(banner().getByText('Accra Branch')).toBeTruthy();
  });

  it('works with the keyboard: native buttons in a list, no tabindex tricks', async () => {
    renderApp('/', { as: 'front_staff' });
    fireEvent.click(await screen.findByRole('button', { name: 'Switch branch' }));
    await screen.findByRole('heading', { level: 1, name: 'Switch branch' });
    await screen.findByRole('button', { name: /Accra Branch/ });
    const list = within(within(screen.getByRole('main')).getByRole('list'));
    for (const b of list.getAllByRole('button')) {
      expect(b.getAttribute('tabindex')).toBeNull();
      expect(b.className).toMatch(/min-h-(11|target)/);
    }
  });
});

describe('Super Admin works across all branches (v0.1.2)', () => {
  it('shows All branches and a labelled filter; no picker, no Switch branch, no PUT', async () => {
    const put = capture('put', '/api/v1/working-branch/', () => apiError(403, 'forbidden', 'No.'));
    server.use(put.handler);
    const { container } = renderApp('/', { as: 'super_admin' });
    await screen.findByText('Active items');
    expect(banner().getByText('All branches', { selector: 'span' })).toBeTruthy();
    expect(banner().getByLabelText('Filter by branch')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Choose your branch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Switch branch' })).toBeNull();
    expect(put.seen).toHaveLength(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes the chosen branch as ?branch= to the dashboard and users queries', async () => {
    const seen: Record<string, string | null> = {};
    server.use(
      http.get('/api/v1/dashboard/', ({ request }) => {
        seen.dashboard = new URL(request.url).searchParams.get('branch');
        return HttpResponse.json({ ...dashboard, location: branchB });
      }),
      http.get('/api/v1/users/', ({ request }) => {
        seen.users = new URL(request.url).searchParams.get('branch');
        return HttpResponse.json({
          count: 0,
          page: 1,
          page_size: 25,
          next: null,
          previous: null,
          results: [],
        });
      }),
    );
    renderApp('/', { as: 'super_admin' });
    const filter = (await screen.findByLabelText('Filter by branch')) as HTMLSelectElement;
    await screen.findByRole('option', { name: 'Kumasi Branch' });
    expect(seen.dashboard).toBeNull();
    fireEvent.change(filter, { target: { value: '3' } });
    await waitFor(() => expect(seen.dashboard).toBe('3'));
    expect(banner().getAllByText('Kumasi Branch').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('link', { name: 'Users' }));
    await waitFor(() => expect(seen.users).toBe('3'));
  });

  it('a front-staff user with must_pick_branch is forced to pick, whatever their permissions', async () => {
    mockSession.workingBranch = null;
    server.use(
      http.get('/api/v1/auth/me/', () =>
        HttpResponse.json({
          ...meByRole.front_staff,
          working_branch: null,
          must_pick_branch: true,
          permissions: [],
        }),
      ),
    );
    renderApp('/', { as: 'front_staff' });
    expect(await screen.findByRole('heading', { name: 'Choose your branch' })).toBeTruthy();
  });
});
