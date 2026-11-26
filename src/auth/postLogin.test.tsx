import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { meByRole } from '../mocks/data';
import { mockSession } from '../mocks/handlers';
import { server } from '../mocks/server';
import { capture, click, type, where } from '../test/helpers';
import { renderApp } from '../test/renderApp';

/** What the real server sent for a Front Staff user with no branch chosen yet. */
const signedIn = (body: object) => () => {
  mockSession.loggedIn = true; // the real server opens the session on login
  mockSession.role = 'front_staff';
  return HttpResponse.json(body);
};
const meAfterLogin = (body: object) => () =>
  mockSession.loggedIn ? HttpResponse.json(body) : new HttpResponse(null, { status: 401 });
const noBranch = { ...meByRole.front_staff, working_branch: null, must_pick_branch: true };

async function signIn() {
  renderApp('/login');
  await screen.findByRole('heading', { name: 'Sign in' });
  type('Login ID', 'USR-0003');
  type('Password', 'a-good-password');
  click('Sign in');
}

describe('after sign-in a Front Staff user with no branch picks one first', () => {
  it('shows the branch picker, not the dashboard', async () => {
    server.use(
      http.post('/api/v1/auth/login/', signedIn(noBranch)),
      http.get('/api/v1/auth/me/', meAfterLogin(noBranch)),
    );
    await signIn();
    expect(await screen.findByRole('heading', { name: 'Choose your branch' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: 'Home' })).toBeNull();
  });

  it('asks /me again after sign-in: a login answer that lacks the flag cannot skip the picker', async () => {
    server.use(
      // the sign-in answer says nothing needs picking; /me, the source of truth, says it does
      http.post('/api/v1/auth/login/', signedIn({ ...noBranch, must_pick_branch: false })),
      http.get('/api/v1/auth/me/', async () => {
        if (!mockSession.loggedIn) return new HttpResponse(null, { status: 401 });
        await delay(50);
        return HttpResponse.json(noBranch);
      }),
    );
    const seen = new Set<string>();
    const watch = new MutationObserver(() =>
      screen.queryAllByRole('heading', { level: 1 }).forEach((h) => seen.add(h.textContent ?? '')),
    );
    watch.observe(document.body, { childList: true, subtree: true, characterData: true });
    await signIn();
    await screen.findByRole('heading', { name: 'Choose your branch' });
    watch.disconnect();
    // No other screen (Sell, Home...) showed in between.
    expect([...seen].filter((t) => !['Sign in', 'Choose your branch'].includes(t))).toEqual([]);
  });

  it('picking sends PUT working-branch with the branch id and then shows the app', async () => {
    let picked = false;
    const put = capture('put', '/api/v1/working-branch/', () => {
      picked = true;
      return HttpResponse.json({ ...meByRole.front_staff });
    });
    server.use(
      put.handler,
      http.post('/api/v1/auth/login/', signedIn(noBranch)),
      http.get('/api/v1/auth/me/', () => meAfterLogin(picked ? meByRole.front_staff : noBranch)()),
    );
    await signIn();
    await screen.findByRole('button', { name: 'Accra Branch' });
    click('Accra Branch');
    await waitFor(() => expect(put.seen).toHaveLength(1));
    expect(put.seen[0].body).toEqual({ branch_id: 2 });
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Choose your branch' })).toBeNull(),
    );
    expect(where()).not.toBe('/login');
  });
});
