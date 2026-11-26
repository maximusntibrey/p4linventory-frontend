import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { activityEvents } from '../../mocks/data';
import { mockSession, mockStore } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const h1 = () => screen.findByRole('heading', { level: 1, name: 'Audit Logs' });
const dataRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const SEARCH = 'Search action, module, reference or login ID';
const get = (path: string) => fetch(new URL(path, globalThis.location.origin));

describe('Audit Logs screen', () => {
  it('lists events newest first as a table, metadata only; axe clean', async () => {
    const { container } = renderApp('/audit-logs', { as: 'super_admin' });
    await h1();
    await screen.findByText('User created');
    const rows = dataRows();
    expect(rows).toHaveLength(6);
    expect(rows[0].textContent).toContain('User created');
    expect(rows[0].textContent).toContain('USR-0004');
    expect(rows[0].textContent).toContain('SA-0001');
    expect(rows[0].textContent).toContain('(Accra time)');
    expect(rows[5].textContent).toContain('Goods receipt created');
    const heads = within(screen.getByRole('table')).getAllByRole('columnheader');
    expect(heads.map((h) => h.textContent?.trim())).toEqual([
      'User',
      'Action',
      'Module',
      'Details',
      'Time',
    ]);
    expect(screen.queryByText(/before|after|GHS/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has labelled search, filters (user, action, module, dates) and an export button', async () => {
    renderApp('/audit-logs', { as: 'super_admin' });
    await h1();
    expect(screen.getByRole('searchbox', { name: SEARCH })).toBeTruthy();
    for (const l of ['User', 'Branch', 'Action', 'Module', 'From date', 'To date']) {
      expect(await screen.findByLabelText(l)).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Apply filters' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeTruthy();
  });

  it('shows a skeleton while loading and no layout of rows before data', async () => {
    renderApp('/audit-logs', { as: 'super_admin' });
    await h1();
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
    await screen.findByText('User created');
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBeNull();
  });

  it('sends the chosen filters to the API and shows what it returns', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/activity-log/', ({ request }) => {
        seen.push(new URL(request.url).search);
        return undefined;
      }),
    );
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByText('User created');
    await screen.findByRole('option', { name: /USR-0003/ });
    type('User', '4');
    type('Branch', '1');
    type('Action', ' dispatch_created ');
    type('Module', 'dispatch');
    type('From date', '2026-11-23');
    type('To date', '2026-11-23');
    click('Apply filters');
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    const last = new URLSearchParams(seen[seen.length - 1]);
    expect(Object.fromEntries(last)).toMatchObject({
      page: '1',
      page_size: '25',
      user_id: '4',
      branch_id: '1',
      action: 'dispatch_created',
      target_type: 'dispatch',
      date_from: '2026-11-23',
      date_to: '2026-11-23',
      ordering: '-timestamp',
    });
  });

  it('search is sent to the API and narrows the rows', async () => {
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByText('User created');
    type(SEARCH, 'trf-000001');
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    expect(dataRows()[0].textContent).toContain('TRF-000001');
  });

  it('sorts on the server through ordering, from the column header buttons', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/activity-log/', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('ordering') ?? '');
        return undefined;
      }),
    );
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByText('User created');
    click('Action');
    await waitFor(() => expect(seen).toContain('action'));
    click('Action');
    await waitFor(() => expect(seen).toContain('-action'));
    click('User');
    await waitFor(() => expect(seen).toContain('user'));
    expect(screen.getByRole('columnheader', { name: /User/ }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
  });

  it('says so when nothing matches, and shows the API message for a bad date range', async () => {
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByText('User created');
    type('Action', 'nothing_like_this');
    click('Apply filters');
    expect(await screen.findByText('No activity matches')).toBeTruthy();
    type('Action', '');
    type('From date', '2026-11-24');
    type('To date', '2026-11-23');
    click('Apply filters');
    expect(await screen.findByText('The end date is before the start date.')).toBeTruthy();
  });

  it('shows the error state with a retry when the list cannot load', async () => {
    server.use(http.get('/api/v1/activity-log/', () => HttpResponse.error(), { once: true }));
    renderApp('/audit-logs', { as: 'super_admin' });
    await h1();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    click('Try again');
    expect(retry).toBeTruthy();
    expect(await screen.findByText('User created')).toBeTruthy();
  });

  it('pages through long logs on the server and can change the page size', async () => {
    for (let i = 7; i <= 30; i++) mockStore.activity.push({ ...activityEvents[0], id: i });
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByRole('button', { name: 'Page 2' });
    expect(dataRows()).toHaveLength(25);
    click('Next');
    await waitFor(() => expect(dataRows()).toHaveLength(5));
    expect(screen.getByRole('button', { name: 'Page 2' }).getAttribute('aria-current')).toBe(
      'page',
    );
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
    await waitFor(() => expect(dataRows()).toHaveLength(30));
  });

  it('flags a self-approved event in words', async () => {
    mockStore.activity[5].is_self_approval = true;
    renderApp('/audit-logs', { as: 'super_admin' });
    expect(await screen.findByText('Self-approved')).toBeTruthy();
  });

  it('keyboard only: filters are reachable and Enter in a field applies them', async () => {
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByText('User created');
    const action = screen.getByLabelText('Action');
    action.focus();
    expect(document.activeElement).toBe(action);
    fireEvent.change(action, { target: { value: 'sale_recorded' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Audit log filters' }));
    await waitFor(() => expect(dataRows()).toHaveLength(1));
  });

  it('Branch Admin sees only own-branch events and no user filter; Front Staff gets the 403 page', async () => {
    const ba = renderApp('/audit-logs', { as: 'branch_admin' });
    await screen.findByText('Dispatch received');
    expect(dataRows()).toHaveLength(2);
    expect(screen.queryByLabelText('User')).toBeNull();
    ba.unmount();
    mockSession.loggedIn = false;
    renderApp('/audit-logs', { as: 'front_staff' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('the old /activity address redirects to /audit-logs', async () => {
    renderApp('/activity', { as: 'super_admin' });
    await h1();
    expect(screen.getByTestId('where').textContent).toBe('/audit-logs');
  });
});

describe('Audit Logs export', () => {
  const stubDownload = () => {
    const create = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    return create;
  };

  it('downloads a CSV for the current filters, and says nothing when it is not cut', async () => {
    const create = stubDownload();
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/activity-log/export/', ({ request }) => {
        seen.push(new URL(request.url).search);
        return undefined;
      }),
    );
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByText('User created');
    type('Module', 'dispatch');
    click('Apply filters');
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    click('Export CSV');
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(new URLSearchParams(seen[0]).get('target_type')).toBe('dispatch');
    expect(new URLSearchParams(seen[0]).get('page')).toBeNull();
    expect(screen.queryByText(/first 5000 rows/)).toBeNull();
  });

  it('shows a notice when the server cut the export (X-Export-Truncated)', async () => {
    stubDownload();
    server.use(
      http.get(
        '/api/v1/activity-log/export/',
        () =>
          new HttpResponse('occurred_at\n', {
            headers: { 'Content-Type': 'text/csv', 'X-Export-Truncated': 'true' },
          }),
      ),
    );
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByText('User created');
    click('Export CSV');
    expect(await screen.findByText(/Only the first 5000 rows were exported/)).toBeTruthy();
  });

  it('shows the API message when the export is refused', async () => {
    stubDownload();
    server.use(
      http.get('/api/v1/activity-log/export/', () =>
        HttpResponse.json(
          { code: 'forbidden', message: 'No export for you.', errors: [] },
          { status: 403 },
        ),
      ),
    );
    renderApp('/audit-logs', { as: 'super_admin' });
    await screen.findByText('User created');
    click('Export CSV');
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});

describe('Audit Logs has its own tab, not the dashboard', () => {
  it.each(['super_admin', 'warehouse_admin', 'branch_admin'] as const)(
    '%s sees an Audit Logs item in the sidebar and opens it',
    async (role) => {
      renderApp('/', { as: role });
      const nav = await screen.findByRole('navigation', { name: 'Main' });
      const link = within(nav).getByRole('link', { name: 'Audit Logs' });
      expect(link.getAttribute('href')).toBe('/audit-logs');
      fireEvent.click(link);
      expect(await h1()).toBeTruthy();
    },
  );

  it('Front Staff has no Audit Logs item', async () => {
    renderApp('/stock', { as: 'front_staff' });
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(nav).queryByRole('link', { name: 'Audit Logs' })).toBeNull();
  });

  it('the dashboard no longer carries recent activity or an audit list', async () => {
    renderApp('/', { as: 'super_admin' });
    await screen.findByText('Active items');
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).toBeNull();
    expect(screen.queryByText(/User created/)).toBeNull();
  });
});

describe('activity mock enforces the contract', () => {
  it('WA sees warehouse events only; BA another branch_id is 403 wrong_branch; bad dates 400', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'warehouse_admin';
    const wa = (await (await get('/api/v1/activity-log/')).json()).results;
    expect(wa.map((e: { branch_id: number }) => e.branch_id)).toEqual([1, 1, 1]);
    mockSession.role = 'branch_admin';
    const r = await get('/api/v1/activity-log/?branch_id=3');
    expect(r.status).toBe(403);
    expect((await r.json()).code).toBe('wrong_branch');
    mockSession.role = 'super_admin';
    expect((await get('/api/v1/activity-log/?date_from=24-11-2026')).status).toBe(400);
    mockSession.role = 'front_staff';
    expect((await get('/api/v1/activity-log/')).status).toBe(403);
  });
});
