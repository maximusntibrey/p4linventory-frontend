import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { server } from '../mocks/server';
import { mockSession } from '../mocks/handlers';
import { renderApp } from '../test/renderApp';
import { meKey } from './session';

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const signIn = (id: string, password: string) => {
  type('Login ID', id);
  type('Password', password);
  click('Sign in');
};
const where = () => screen.getByTestId('where').textContent;
const summaryFocused = async () => {
  const alert = await screen.findByRole('alert');
  await waitFor(() => expect(document.activeElement).toBe(alert));
  return alert;
};

describe('login', () => {
  it('signs in and opens Home with the login ID in the top bar', async () => {
    renderApp('/login');
    signIn('SA-0001', 'correct horse');
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    expect(where()).toBe('/');
    expect(within(screen.getByRole('banner')).getByText('SA-0001')).toBeTruthy();
  });

  it('has labelled fields, one primary button, and no axe violations', async () => {
    const { container } = renderApp('/login');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(screen.getByLabelText('Login ID')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('wrong password: shows the API message and moves focus to the summary', async () => {
    const { container } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    signIn('SA-0001', 'wrong');
    const alert = await summaryFocused();
    expect(alert.textContent).toContain('Login ID or password is not right.');
    expect(where()).toBe('/login');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('empty fields: inline errors next to each field and focus on the summary', async () => {
    const { container } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    click('Sign in');
    const alert = await summaryFocused();
    expect(alert.textContent).toContain('Check the highlighted fields.');
    const id = screen.getByLabelText('Login ID');
    expect(id.getAttribute('aria-invalid')).toBe('true');
    expect(id.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getAllByText('Enter your password.').length).toBeGreaterThan(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows a field error from the API body next to that field', async () => {
    server.use(
      http.post('/api/v1/auth/login/', () =>
        HttpResponse.json(
          {
            code: 'validation_error',
            message: 'Check the highlighted fields.',
            errors: [{ field: 'login_id', message: 'That is not a valid login ID.' }],
          },
          { status: 400 },
        ),
      ),
    );
    renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    signIn('nope', 'x');
    await summaryFocused();
    const id = screen.getByLabelText('Login ID');
    expect(id.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByText('That is not a valid login ID.')).toHaveLength(2);
  });

  it('429: says to wait, using Retry-After, and focuses the summary', async () => {
    renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    signIn('SA-0001', 'locked');
    const alert = await summaryFocused();
    expect(alert.textContent).toContain('Too many attempts. Wait 15 minutes, then try again.');
    expect(where()).toBe('/login');
  });

  it('a server that cannot be reached gives a plain message', async () => {
    server.use(http.post('/api/v1/auth/login/', () => HttpResponse.error()));
    renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    signIn('SA-0001', 'x');
    expect((await summaryFocused()).textContent).toContain('Could not reach the server.');
  });

  it('a signed-in user who opens /login is sent on', async () => {
    renderApp('/login', { as: 'branch_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    expect(where()).toBe('/');
  });
});

describe('forced password change (one-time password)', () => {
  it('login lands on the change screen, with no menu; a short password is refused by the API', async () => {
    const { container } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    signIn('USR-0004', 'one-time-pass');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose a new password' }),
    ).toBeTruthy();
    expect(where()).toBe('/password-change');
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();

    type('One-time password', 'one-time-pass');
    type('New password', 'short');
    type('Confirm new password', 'short');
    click('Save new password');
    const alert = await summaryFocused();
    expect(alert.textContent).toContain('Use at least 10 characters.');
    expect(screen.getByLabelText('New password').getAttribute('aria-invalid')).toBe('true');
  });

  it('after a good new password the app opens', async () => {
    renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    signIn('USR-0004', 'one-time-pass');
    await screen.findByRole('heading', { name: 'Choose a new password' });
    type('One-time password', 'one-time-pass');
    type('New password', 'a-brand-new-pass');
    type('Confirm new password', 'a-brand-new-pass');
    click('Save new password');
    // Front Staff has no Home entry, so the first menu entry opens.
    expect(await screen.findByRole('heading', { level: 1, name: 'Sell' })).toBeTruthy();
    expect(where()).toBe('/sell');
    expect(mockSession.mustChange).toBe(false);
  });

  it('the pending user can only log out from here', async () => {
    renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    signIn('USR-0004', 'one-time-pass');
    await screen.findByRole('heading', { name: 'Choose a new password' });
    click('Log out');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy();
    expect(mockSession.loggedIn).toBe(false);
  });
});

describe('change own password', () => {
  it('refuses a wrong current password with a field error, then confirms the change', async () => {
    const { container } = renderApp('/account/password', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Change password' });
    expect(await axe(container)).toHaveNoViolations();

    type('Current password', 'wrong');
    type('New password', 'a-long-new-password');
    type('Confirm new password', 'a-long-new-password');
    click('Save new password');
    await summaryFocused();
    expect(screen.getAllByText('Your current password is not right.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Current password').getAttribute('aria-invalid')).toBe('true');

    type('Current password', 'old-password-1');
    click('Save new password');
    expect((await screen.findByRole('status')).textContent).toContain('Your password was changed.');
    expect((screen.getByLabelText('New password') as HTMLInputElement).value).toBe('');
  });

  it('checks that the two new passwords match before sending', async () => {
    renderApp('/account/password', { as: 'super_admin' });
    await screen.findByRole('heading', { name: 'Change password' });
    type('Current password', 'old-password-1');
    type('New password', 'a-long-new-password');
    type('Confirm new password', 'something-else-1');
    click('Save new password');
    await summaryFocused();
    expect(screen.getAllByText('The two new passwords do not match.').length).toBeGreaterThan(0);
  });
});

describe('session ended later (FIX-15, FIX-16, FIX-17)', () => {
  it('a 401 after sign-in sends the user to login with a message, and back after signing in', async () => {
    server.use(
      http.post('/api/v1/auth/password/', () =>
        HttpResponse.json(
          { code: 'not_authenticated', message: 'Log in to continue.', errors: [] },
          { status: 401 },
        ),
      ),
    );
    renderApp('/account/password', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Change password' });
    type('Current password', 'old-password-1');
    type('New password', 'a-long-new-password');
    type('Confirm new password', 'a-long-new-password');
    click('Save new password');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy();
    expect(screen.getByText('Your session has ended. Sign in again.')).toBeTruthy();
    expect(where()).toBe('/login');
    server.resetHandlers();
    signIn('SA-0001', 'correct horse');
    expect(await screen.findByRole('heading', { level: 1, name: 'Change password' })).toBeTruthy();
    expect(where()).toBe('/account/password');
  });

  it('a failed /me refresh keeps the screen and what the user typed', async () => {
    const { client } = renderApp('/account/password', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Change password' });
    type('New password', 'half-typed-password');
    server.use(http.get('/api/v1/auth/me/', () => HttpResponse.error()));
    await client.invalidateQueries({ queryKey: meKey });
    await waitFor(() => expect(client.getQueryState(meKey)?.status).toBe('error'));
    expect((screen.getByLabelText('New password') as HTMLInputElement).value).toBe(
      'half-typed-password',
    );
    expect(screen.queryByText('Could not reach the server.')).toBeNull();
  });

  it('no password stays in the mutation cache after login', async () => {
    const { client } = renderApp('/login');
    await screen.findByRole('heading', { name: 'Sign in' });
    signIn('SA-0001', 'correct horse');
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    await waitFor(() =>
      expect(
        JSON.stringify(
          client
            .getMutationCache()
            .getAll()
            .map((m) => m.state.variables),
        ),
      ).not.toContain('correct horse'),
    );
  });
});

describe('logout', () => {
  it('ends the session, clears the query cache and shows the login screen', async () => {
    const { client } = renderApp('/', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    client.setQueryData(['items'], [{ id: 1 }]);
    click('Log out');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy();
    expect(where()).toBe('/login');
    expect(mockSession.loggedIn).toBe(false);
    expect(client.getQueryData(['items'])).toBeUndefined();
    await waitFor(() => expect(client.getQueryData(meKey)).toBeNull());
  });

  it('if the server cannot be reached the user stays signed in and is told', async () => {
    server.use(http.post('/api/v1/auth/logout/', () => HttpResponse.error()));
    renderApp('/', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    click('Log out');
    expect((await screen.findByRole('alert')).textContent).toContain('Could not log out.');
    expect(where()).toBe('/');
  });

  it('branch switching stays disabled until F3.1', async () => {
    renderApp('/', { as: 'front_staff' });
    await screen.findByRole('navigation', { name: 'Main' });
    expect(screen.getByRole('button', { name: 'Switch branch' }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});
