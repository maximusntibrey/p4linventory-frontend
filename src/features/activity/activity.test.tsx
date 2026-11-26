import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { axe } from 'vitest-axe';
import { activityEvents } from '../../mocks/data';
import { mockSession, mockStore } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const h1 = () => screen.findByRole('heading', { level: 1, name: 'Activity' });
const rows = () => within(screen.getByRole('main')).getAllByRole('listitem');
const get = (path: string) => fetch(new URL(path, globalThis.location.origin));

describe('activity log screen', () => {
  it('lists events newest first with metadata only; axe clean', async () => {
    const { container } = renderApp('/activity', { as: 'super_admin' });
    await h1();
    await screen.findByText(/User created/);
    const items = rows();
    expect(items).toHaveLength(6);
    expect(items[0].textContent).toContain('User created');
    expect(items[0].textContent).toContain('USR-0004');
    expect(items[0].textContent).toContain('SA-0001 (Super admin)');
    expect(items[5].textContent).toContain('Goods receipt created');
    expect(screen.queryByText(/cost|before|after|GHS/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has labelled filters for user, branch, action and dates', async () => {
    renderApp('/activity', { as: 'super_admin' });
    await h1();
    for (const l of ['User', 'Branch', 'Action', 'From date', 'To date']) {
      expect(await screen.findByLabelText(l)).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Apply filters' })).toBeTruthy();
  });

  it('sends the chosen filters to the API and shows what it returns', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/activity-log/', ({ request }) => {
        seen.push(new URL(request.url).search);
        return undefined;
      }),
    );
    renderApp('/activity', { as: 'super_admin' });
    await screen.findByText(/User created/);
    await screen.findByRole('option', { name: /USR-0003/ });
    type('User', '4');
    type('Branch', '1');
    type('Action', ' dispatch_created ');
    type('From date', '2026-11-23');
    type('To date', '2026-11-23');
    click('Apply filters');
    await waitFor(() => expect(rows()).toHaveLength(2));
    const last = new URLSearchParams(seen[seen.length - 1]);
    expect(Object.fromEntries(last)).toMatchObject({
      page: '1',
      user_id: '4',
      branch_id: '1',
      action: 'dispatch_created',
      date_from: '2026-11-23',
      date_to: '2026-11-23',
    });
    expect(screen.getAllByText(/Dispatch created/)).toHaveLength(2);
  });

  it('says so when nothing matches, and shows the API message for a bad date range', async () => {
    renderApp('/activity', { as: 'super_admin' });
    await screen.findByText(/User created/);
    type('Action', 'nothing_like_this');
    click('Apply filters');
    expect(await screen.findByText('No activity matches.')).toBeTruthy();
    type('Action', '');
    type('From date', '2026-11-24');
    type('To date', '2026-11-23');
    click('Apply filters');
    expect(await screen.findByText('The end date is before the start date.')).toBeTruthy();
  });

  it('pages through long logs', async () => {
    for (let i = 7; i <= 30; i++) mockStore.activity.push({ ...activityEvents[0], id: i });
    renderApp('/activity', { as: 'super_admin' });
    await screen.findByText('Page 1');
    expect(rows().length).toBe(25);
    click('Next');
    await screen.findByText('Page 2');
    await waitFor(() => expect(rows().length).toBe(5));
    click('Previous');
    await screen.findByText('Page 1');
  });

  it('flags a self-approved event in words', async () => {
    mockStore.activity[5].is_self_approval = true;
    renderApp('/activity', { as: 'super_admin' });
    expect(await screen.findByText('Self-approved')).toBeTruthy();
  });

  it('keyboard only: filters are reachable and Enter in a field applies them', async () => {
    renderApp('/activity', { as: 'super_admin' });
    await screen.findByText(/User created/);
    const action = screen.getByLabelText('Action');
    action.focus();
    expect(document.activeElement).toBe(action);
    fireEvent.change(action, { target: { value: 'sale_recorded' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Activity filters' }));
    await waitFor(() => expect(rows()).toHaveLength(1));
  });

  it('Branch Admin sees only own-branch events and no user filter; Front Staff gets the 403 page', async () => {
    const ba = renderApp('/activity', { as: 'branch_admin' });
    await screen.findByText(/Dispatch received/);
    expect(rows()).toHaveLength(2);
    expect(screen.queryByLabelText('User')).toBeNull();
    ba.unmount();
    mockSession.loggedIn = false;
    renderApp('/activity', { as: 'front_staff' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
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
