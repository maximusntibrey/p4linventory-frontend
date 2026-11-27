import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { meByRole, users } from '../../mocks/data';
import { server } from '../../mocks/server';
import { apiError, capture, click, type, where } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const OTP_CREATE = 'Mock-OTP-7421';
const OTP_RESET = 'Mock-OTP-1138';
const clipboard = (impl?: (t: string) => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', {
    value: impl ? { writeText: impl } : undefined,
    configurable: true,
  });
afterEach(() => clipboard());

/** Session whose /me lets the user view users but not manage them. */
const viewOnly = () =>
  server.use(
    http.get('/api/v1/auth/me/', () =>
      HttpResponse.json({ ...meByRole.super_admin, permissions: ['users.view', 'branches.view'] }),
    ),
  );
/** Session that may assign one role only. */
const singleRole = () =>
  server.use(
    http.get('/api/v1/auth/me/', () =>
      HttpResponse.json({ ...meByRole.super_admin, can_assign_multiple_roles: false }),
    ),
  );
const inMain = () => within(screen.getByRole('main'));
const cachedData = (client: ReturnType<typeof renderApp>['client']) =>
  JSON.stringify(
    client
      .getMutationCache()
      .getAll()
      .map((m) => m.state.data),
  );

describe('users list', () => {
  it('shows each person with role, login ID and status as text + icon; axe clean', async () => {
    const { container } = renderApp('/users', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Users' })).toBeTruthy();
    expect(await screen.findByRole('link', { name: 'Kofi Boateng' })).toBeTruthy();
    const row = screen.getByRole('link', { name: 'Kofi Boateng' }).closest('tr')!;
    expect(within(row).getByText('USR-0002')).toBeTruthy();
    expect(within(row).getByText('Branch Admin')).toBeTruthy();
    const pending = screen.getByRole('link', { name: 'Efua Quaye' }).closest('tr')!;
    expect(within(pending).getByText('Pending activation')).toBeTruthy();
    expect(pending.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Add a user' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('searching sends the text to the API and shows only the matches', async () => {
    renderApp('/users', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Users' });
    type('Search by name or login ID', 'esi');
    click('Search');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Kofi Boateng' })).toBeNull());
    expect(screen.getByRole('link', { name: 'Esi Owusu' })).toBeTruthy();
  });

  it('shows the empty state', async () => {
    renderApp('/users', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Users' });
    type('Search by name or login ID', 'nobody-by-this-name');
    click('Search');
    expect(await screen.findByText('No users match')).toBeTruthy();
  });

  it('a view-only user gets no Add button', async () => {
    viewOnly();
    renderApp('/users', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Users' });
    expect(screen.queryByRole('link', { name: 'Add a user' })).toBeNull();
  });

  it('when the API answers 403 the 403 page is shown', async () => {
    server.use(http.get('/api/v1/users/', () => apiError(403, 'permission_denied', 'No.')));
    renderApp('/users', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });
});

describe('create a user: one-time password shown once', () => {
  async function fillAndSubmit() {
    renderApp('/users/new', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Add a user' });
    type('Full name', 'Nana Addo');
    fireEvent.click(screen.getByLabelText('Front Staff'));
    click('Create user');
  }

  it('checks the name and role before sending', async () => {
    renderApp('/users/new', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Add a user' });
    click('Create user');
    expect(await screen.findByText('Enter the full name.')).toBeTruthy();
    expect(screen.getByText('Choose at least one role.')).toBeTruthy();
  });

  it('offers several roles (checkboxes) only when /me says can_assign_multiple_roles, and sends them all', async () => {
    const post = capture('post', '/api/v1/users/', () =>
      HttpResponse.json(
        {
          ...users[2],
          one_time_password: 'x',
          one_time_password_expires_at: '2026-11-26T14:05:00Z',
        },
        { status: 201 },
      ),
    );
    server.use(post.handler);
    renderApp('/users/new', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Add a user' });
    type('Full name', 'Nana Addo');
    fireEvent.click(screen.getByLabelText('Front Staff'));
    fireEvent.click(screen.getByLabelText('Branch Admin'));
    click('Create user');
    await waitFor(() => expect(post.seen).toHaveLength(1));
    expect((post.seen[0].body as { roles: string[] }).roles.sort()).toEqual([
      'branch_admin',
      'front_staff',
    ]);
  });

  it('offers one role (radio buttons) when /me does not allow several', async () => {
    singleRole();
    renderApp('/users/new', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Add a user' });
    expect((screen.getByLabelText('Front Staff') as HTMLInputElement).type).toBe('radio');
    click('Create user');
    expect(await screen.findByText('Choose a role.')).toBeTruthy();
  });

  it('sends the key and shows the generated ID and the password with copy, then clears on Done', async () => {
    const post = capture('post', '/api/v1/users/', () =>
      HttpResponse.json(
        {
          ...users[2],
          id: 6,
          login_id: 'USR-0005',
          full_name: 'Nana Addo',
          status: 'pending_activation',
          must_change_password: true,
          one_time_password: OTP_CREATE,
          one_time_password_expires_at: '2026-11-26T14:05:00Z',
        },
        { status: 201 },
      ),
    );
    server.use(post.handler);
    const writeText = vi.fn(() => Promise.resolve());
    clipboard(writeText);
    renderApp('/users/new', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Add a user' });
    type('Full name', 'Nana Addo');
    fireEvent.click(screen.getByLabelText('Front Staff'));
    click('Create user');

    expect(await screen.findByText(OTP_CREATE)).toBeTruthy();
    expect(screen.getByText(/Their login ID is USR-0005/)).toBeTruthy();
    expect(screen.getByText(/shown only once/)).toBeTruthy();
    expect(screen.getByText(/Accra time/)).toBeTruthy();
    expect(post.seen[0].body).toEqual({ full_name: 'Nana Addo', roles: ['front_staff'] });
    expect(post.seen[0].key).toBeTruthy();

    click('Copy password');
    expect(await screen.findByText('Password copied.')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(OTP_CREATE);

    click('I have saved it');
    expect(await screen.findByRole('heading', { level: 1, name: 'Users' })).toBeTruthy();
    expect(where()).toBe('/users');
    expect(screen.queryByText(OTP_CREATE)).toBeNull();
  });

  it('is never kept in the query cache, the mutation cache or browser storage', async () => {
    const { client } = renderApp('/users/new', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Add a user' });
    type('Full name', 'Nana Addo');
    fireEvent.click(screen.getByLabelText('Front Staff'));
    click('Create user');
    await screen.findByText(OTP_CREATE);
    expect(cachedData(client)).not.toContain(OTP_CREATE);
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain(OTP_CREATE);
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(OTP_CREATE);
    expect(location.href).not.toContain(OTP_CREATE);
  });

  it('leaving the screen without Done also drops it', async () => {
    await fillAndSubmit();
    await screen.findByText(OTP_CREATE);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByText('Branches'));
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    expect(screen.queryByText(OTP_CREATE)).toBeNull();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByText('Users'));
    await screen.findByRole('heading', { level: 1, name: 'Users' });
    expect(screen.queryByText(OTP_CREATE)).toBeNull();
  });

  it('says so when the password cannot be copied', async () => {
    clipboard(); // no clipboard in this browser
    await fillAndSubmit();
    await screen.findByText(OTP_CREATE);
    click('Copy password');
    expect((await screen.findByText(/Could not copy/)).textContent).toContain('by hand');
  });

  it('the password panel has no axe violations', async () => {
    await fillAndSubmit();
    await screen.findByText(OTP_CREATE);
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('shows the API field error and a 403 in plain words', async () => {
    server.use(
      http.post('/api/v1/users/', () =>
        apiError(400, 'validation_error', 'Check the highlighted fields.', [
          { field: 'permanent_location_id', message: 'Pick the warehouse for this role.' },
        ]),
      ),
    );
    renderApp('/users/new', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Add a user' });
    type('Full name', 'Nana Addo');
    fireEvent.click(screen.getByLabelText('Warehouse Admin'));
    click('Create user');
    expect(
      (await screen.findAllByText('Pick the warehouse for this role.')).length,
    ).toBeGreaterThan(1);
    expect(screen.getByLabelText('Permanent location').getAttribute('aria-invalid')).toBe('true');
  });

  it('a user without users.manage gets the 403 page on this route', async () => {
    viewOnly();
    renderApp('/users/new', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('an API 403 on save is shown and no password appears', async () => {
    server.use(
      http.post('/api/v1/users/', () =>
        apiError(403, 'permission_denied', 'You cannot add users.'),
      ),
    );
    await fillAndSubmit();
    expect((await screen.findByRole('alert')).textContent).toContain('You cannot add users.');
    expect(screen.queryByText(OTP_CREATE)).toBeNull();
  });

  it('sends the chosen permanent location', async () => {
    const post = capture('post', '/api/v1/users/', () => apiError(400, 'validation_error', 'x'));
    server.use(post.handler);
    renderApp('/users/new', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Add a user' });
    await screen.findByRole('option', { name: 'Accra Branch' });
    type('Full name', 'Nana Addo');
    fireEvent.click(screen.getByLabelText('Branch Admin'));
    type('Permanent location', '2');
    click('Create user');
    await waitFor(() => expect(post.seen).toHaveLength(1));
    expect(post.seen[0].body).toEqual({
      full_name: 'Nana Addo',
      roles: ['branch_admin'],
      permanent_location_id: 2,
    });
  });
});

describe('user detail', () => {
  it('shows the user and the management sections; axe clean', async () => {
    const { container } = renderApp('/users/2', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' })).toBeTruthy();
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Kofi Boateng');
    expect((screen.getByLabelText('Branch Admin') as HTMLInputElement).checked).toBe(true);
    await waitFor(() =>
      expect((screen.getByLabelText('Permanent location') as HTMLSelectElement).value).toBe('2'),
    );
    expect(await screen.findByLabelText('Receive stock')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a view-only user sees the person but no edit, status, reset or permission controls', async () => {
    viewOnly();
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    expect(screen.queryByRole('button', { name: 'Reset password' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.queryByText('Permissions')).toBeNull();
  });

  it('an unknown user is reported, not blank', async () => {
    renderApp('/users/99', { as: 'super_admin' });
    expect((await screen.findByRole('alert')).textContent).toContain('No such record.');
  });

  it('saves edits with a key', async () => {
    const patch = capture('patch', '/api/v1/users/2/', () => HttpResponse.json(users[1]));
    server.use(patch.handler);
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    await waitFor(() =>
      expect((screen.getByLabelText('Permanent location') as HTMLSelectElement).value).toBe('2'),
    );
    type('Full name', 'Kofi B. Boateng');
    click('Save changes');
    expect((await screen.findByText('Changes saved.')).textContent).toBeTruthy();
    expect(patch.seen[0].body).toEqual({
      full_name: 'Kofi B. Boateng',
      roles: ['branch_admin'],
      permanent_location_id: 2,
    });
    expect(patch.seen[0].key).toBeTruthy();
  });

  it('a person with several roles keeps them: roles are shown, not sent', async () => {
    server.use(
      http.get('/api/v1/users/2/', () =>
        HttpResponse.json({ ...users[1], roles: ['branch_admin', 'front_staff'] }),
      ),
    );
    const patch = capture('patch', '/api/v1/users/2/', () => HttpResponse.json(users[1]));
    server.use(patch.handler);
    singleRole();
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    expect(
      screen.getAllByText('Branch Admin, Front Staff', { exact: false }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Front Staff')).toBeNull();
    click('Save changes');
    await waitFor(() => expect(patch.seen).toHaveLength(1));
    expect(patch.seen[0].body).not.toHaveProperty('roles');
  });

  it('grants and revokes per-person permissions with Save', async () => {
    const put = capture('put', '/api/v1/users/2/permissions/', () =>
      HttpResponse.json({ permissions: ['receive_stock', 'manage_prices'] }),
    );
    server.use(put.handler);
    renderApp('/users/2', { as: 'super_admin' });
    const receive = (await screen.findByLabelText('Receive stock')) as HTMLInputElement;
    expect(receive.checked).toBe(true);
    expect((screen.getByLabelText('Discount') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText('Manage prices'));
    click('Save permissions');
    expect(await screen.findByText('Permissions saved.')).toBeTruthy();
    expect(put.seen[0].body).toEqual({ permissions: ['receive_stock', 'manage_prices'] });
    expect(put.seen[0].key).toBeTruthy();
  });

  it('when the API refuses to show permissions (403) the card says so inline', async () => {
    server.use(
      http.get('/api/v1/users/:id/permissions/', () => apiError(403, 'permission_denied', 'No.')),
    );
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    expect((await screen.findByText(/not allowed to see this/)).getAttribute('role')).toBe('alert');
    expect(screen.getByRole('heading', { level: 1, name: 'Kofi Boateng' })).toBeTruthy();
  });
});

describe('status and password actions have a confirm step', () => {
  it('suspend: nothing is sent until Yes; the reason travels; the result is announced', async () => {
    const post = capture('post', '/api/v1/users/2/status/', () =>
      HttpResponse.json({ ...users[1], status: 'suspended' }),
    );
    server.use(post.handler);
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    click('Suspend');
    const group = await screen.findByRole('group', { name: /Suspend Kofi Boateng\?/ });
    await waitFor(() => expect(document.activeElement).toBe(group));
    expect(post.seen).toHaveLength(0);
    expect(await axe(document.body)).toHaveNoViolations();
    type('Reason (optional)', 'Away on leave');
    fireEvent.click(within(group).getByRole('button', { name: 'Yes, suspend' }));
    expect((await screen.findAllByText('Kofi Boateng is now suspended.')).length).toBeGreaterThan(
      0,
    );
    expect(post.seen[0].body).toEqual({ status: 'suspended', reason: 'Away on leave' });
    expect(post.seen[0].key).toBeTruthy();
    expect(screen.queryByRole('group', { name: /Suspend Kofi/ })).toBeNull();
  });

  it('offers only the other statuses, and Cancel sends nothing', async () => {
    const post = capture('post', '/api/v1/users/2/status/', () => HttpResponse.json(users[1]));
    server.use(post.handler);
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    expect(screen.queryByRole('button', { name: 'Activate' })).toBeNull();
    click('Deactivate');
    fireEvent.click(
      within(await screen.findByRole('group', { name: /Deactivate Kofi/ })).getByRole('button', {
        name: 'Cancel',
      }),
    );
    expect(screen.queryByRole('group', { name: /Deactivate Kofi/ })).toBeNull();
    expect(post.seen).toHaveLength(0);
  });

  it('the API refusing (own account, 409) is shown in the confirm step', async () => {
    renderApp('/users/1', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Ama Mensah' });
    click('Deactivate');
    fireEvent.click(
      within(await screen.findByRole('group', { name: /Deactivate Ama/ })).getByRole('button', {
        name: 'Yes, deactivate',
      }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'You cannot change your own status.',
    );
  });

  it('reset password: confirm first, then the new password is shown once and never cached', async () => {
    const post = capture('post', '/api/v1/users/2/reset-password/', () =>
      HttpResponse.json({
        one_time_password: OTP_RESET,
        one_time_password_expires_at: '2026-11-26T14:05:00Z',
      }),
    );
    server.use(post.handler);
    const { client } = renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    click('Reset password');
    const group = await screen.findByRole('group', {
      name: /Reset the password for Kofi Boateng\?/,
    });
    expect(post.seen).toHaveLength(0);
    fireEvent.click(within(group).getByRole('button', { name: 'Yes, reset password' }));
    expect(await screen.findByText(OTP_RESET)).toBeTruthy();
    expect(post.seen).toHaveLength(1);
    expect(post.seen[0].key).toBeTruthy();
    expect(cachedData(client)).not.toContain(OTP_RESET);
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain(OTP_RESET);
    click('I have saved it');
    expect(screen.queryByText(OTP_RESET)).toBeNull();
  });

  it('a 403 on reset is reported and no password is shown', async () => {
    server.use(
      http.post('/api/v1/users/2/reset-password/', () =>
        apiError(403, 'permission_denied', 'You cannot reset passwords.'),
      ),
    );
    renderApp('/users/2', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Kofi Boateng' });
    click('Reset password');
    fireEvent.click(
      within(await screen.findByRole('group', { name: /Reset the password/ })).getByRole('button', {
        name: 'Yes, reset password',
      }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain('You cannot reset passwords.');
    expect(inMain().queryByText(OTP_RESET)).toBeNull();
  });
});
