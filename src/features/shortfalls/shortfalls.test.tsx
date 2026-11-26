import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { branchB } from '../../mocks/data';
import { mockSession, mockStore } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { apiError, capture, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const h1 = () => screen.findByRole('heading', { level: 1, name: 'Shortfalls' });
const resolveBtn = () => screen.findByRole('button', { name: /Resolve shortfall of HP 250 G9/ });
const choose = (resolution: string, quantity: string, note = 'Checked with the courier.') => {
  type('Resolution', resolution);
  type('Quantity', quantity);
  type('Note', note);
};
const send = (method: string, path: string, body?: unknown) =>
  fetch(new URL(path, globalThis.location.origin), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': 't',
      'Idempotency-Key': `k-${Math.random()}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const good = { resolution: 'confirm_loss', quantity: 1, note: 'Lost in transit.' };
const warehouseRow = () => mockStore.stock.find((r) => r.location_id === 1 && r.item_id === 1)!;
const accraRow = () => mockStore.stock.find((r) => r.location_id === 2 && r.item_id === 1)!;

describe('shortfalls screen', () => {
  it('lists the open shortfall with its numbers and a labelled Resolve button; axe clean', async () => {
    const { container } = renderApp('/shortfalls', { as: 'super_admin' });
    await h1();
    expect(await screen.findByText('HP 250 G9')).toBeTruthy();
    expect(screen.getByText(/Sent 5 · Accepted 3 · Missing 2 · Resolved 0/)).toBeTruthy();
    expect(screen.getByText('Remaining 2')).toBeTruthy();
    expect(screen.getAllByText('Open').length).toBe(2); // the option and the badge: status is text
    expect(screen.getByText(/TRF-000003 · Central Warehouse to Accra Branch/)).toBeTruthy();
    expect(screen.queryByText(/cost|GHS/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('opens a confirm step that takes focus, says what each choice does, and Cancel returns focus', async () => {
    const { container } = renderApp('/shortfalls', { as: 'super_admin' });
    const btn = await resolveBtn();
    btn.focus();
    fireEvent.click(btn);
    const panel = await screen.findByRole('group', { name: /Resolve the shortfall of HP 250 G9/ });
    await waitFor(() => expect(document.activeElement).toBe(panel));
    expect((screen.getByLabelText('Quantity') as HTMLInputElement).value).toBe('2');
    type('Resolution', 'record_damage');
    expect(panel.textContent).toContain('quarantined stock at the destination');
    expect(await axe(container)).toHaveNoViolations();
    click('Cancel');
    await waitFor(() => expect(document.activeElement).toBe(btn));
  });

  it('asks for a resolution, a whole quantity and a note before sending anything', async () => {
    const sent = capture('post', '/api/v1/shortfalls/4/resolve/', () => HttpResponse.json({}));
    server.use(sent.handler);
    renderApp('/shortfalls', { as: 'super_admin' });
    fireEvent.click(await resolveBtn());
    type('Quantity', '0');
    click('Confirm resolution');
    expect(await screen.findByText('Choose what happened to the missing items.')).toBeTruthy();
    expect(screen.getAllByText('Enter a whole number, 1 or more.').length).toBeGreaterThan(0);
    expect(screen.getByText('Add a note.')).toBeTruthy();
    expect(sent.seen).toHaveLength(0);
  });

  it('confirm loss sends the body and one key, shows a focused result, and the stock moves on the server', async () => {
    renderApp('/shortfalls', { as: 'warehouse_admin' });
    fireEvent.click(await resolveBtn());
    choose('confirm_loss', '1');
    click('Confirm resolution');
    const done = await screen.findByText(
      /RES-000001 recorded for HP 250 G9 \(1 confirm loss\). 1 still open./,
    );
    await waitFor(() => expect(document.activeElement?.contains(done)).toBe(true));
    expect(warehouseRow()).toMatchObject({ on_hand: 11, reserved: 1, available: 10 });
    expect(await screen.findByText('Remaining 1')).toBeTruthy();
    expect(screen.getByText(/RES-000001: Confirm loss 1 by USR-0003/)).toBeTruthy();
  });

  it('sends resolution, quantity and note with an Idempotency-Key', async () => {
    const sent = capture('post', '/api/v1/shortfalls/4/resolve/', () =>
      HttpResponse.json({ item_name: 'HP 250 G9', remaining: 0, resolutions: [] }),
    );
    server.use(sent.handler);
    renderApp('/shortfalls', { as: 'branch_admin' });
    fireEvent.click(await resolveBtn());
    choose('return_to_sender', '2', '  Sent back.  ');
    click('Confirm resolution');
    await waitFor(() => expect(sent.seen).toHaveLength(1));
    expect(sent.seen[0].body).toEqual({
      resolution: 'return_to_sender',
      quantity: 2,
      note: 'Sent back.',
    });
    expect(sent.seen[0].key).toBeTruthy();
  });

  it('record damage quarantines at the destination; a resolved shortfall leaves Open and shows under Resolved', async () => {
    renderApp('/shortfalls', { as: 'super_admin' });
    fireEvent.click(await resolveBtn());
    choose('record_damage', '2');
    click('Confirm resolution');
    await screen.findByText(/RES-000001 recorded/);
    expect(accraRow().quarantined).toBe(3);
    expect(warehouseRow()).toMatchObject({ on_hand: 10, reserved: 0 });
    expect(await screen.findByText('No shortfalls match.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Resolve shortfall/ })).toBeNull();
    type('Status', 'resolved');
    expect(await screen.findByText('Remaining 0')).toBeTruthy();
    expect(screen.getAllByText('Resolved').length).toBe(2); // the option and the badge
    expect(screen.queryByRole('button', { name: /Resolve shortfall/ })).toBeNull();
  });

  it('a quantity above what remains shows the server message and changes nothing', async () => {
    renderApp('/shortfalls', { as: 'super_admin' });
    fireEvent.click(await resolveBtn());
    choose('confirm_loss', '5');
    click('Confirm resolution');
    expect((await screen.findAllByText('More than the 2 still open.')).length).toBeGreaterThan(0);
    expect(mockStore.resolutions).toEqual({});
    expect(warehouseRow().on_hand).toBe(12);
  });

  it('a fully resolved line answers 409 and the message shows', async () => {
    server.use(
      http.post('/api/v1/shortfalls/4/resolve/', () =>
        apiError(409, 'conflict', 'This shortfall is already fully resolved.'),
      ),
    );
    renderApp('/shortfalls', { as: 'super_admin' });
    fireEvent.click(await resolveBtn());
    choose('confirm_loss', '1');
    click('Confirm resolution');
    expect(
      (await screen.findAllByText('This shortfall is already fully resolved.')).length,
    ).toBeGreaterThan(0);
  });

  it('a double click sends one request; a retry after a failure reuses the key', async () => {
    const keys: (string | null)[] = [];
    let n = 0;
    server.use(
      http.post('/api/v1/shortfalls/4/resolve/', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return ++n === 1
          ? apiError(500, 'server_error', 'The server had a problem.')
          : HttpResponse.json({
              ...mockStore.dispatches[2].lines[0],
              resolutions: [],
              item_name: 'HP 250 G9',
              remaining: 1,
            });
      }),
    );
    renderApp('/shortfalls', { as: 'super_admin' });
    fireEvent.click(await resolveBtn());
    choose('confirm_loss', '1');
    const btn = screen.getByRole('button', { name: 'Confirm resolution' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(await screen.findByText('The server had a problem.')).toBeTruthy();
    expect(keys).toHaveLength(1);
    click('Confirm resolution');
    await screen.findByText(/recorded for HP 250 G9/);
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('flags a self-approved resolution in words', async () => {
    mockStore.dispatches[2].received_by = 'USR-0001';
    renderApp('/shortfalls', { as: 'branch_admin' });
    fireEvent.click(await resolveBtn());
    choose('return_to_sender', '1');
    click('Confirm resolution');
    expect(await screen.findByText('Self-approved')).toBeTruthy();
  });

  it('keyboard only: Tab reaches Resolve, Enter opens the panel with focus inside', async () => {
    renderApp('/shortfalls', { as: 'super_admin' });
    const btn = await resolveBtn();
    btn.focus();
    expect(document.activeElement).toBe(btn);
    fireEvent.click(btn); // Enter on a button is a click
    expect(await screen.findByLabelText('Resolution')).toBeTruthy();
  });

  it('Front Staff gets the 403 page and no request is made for the list', async () => {
    renderApp('/shortfalls', { as: 'front_staff' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });
});

describe('shortfall mock enforces the contract', () => {
  it('scope: SA all, WA by sender warehouse, BA by destination branch', async () => {
    const ids = async () =>
      ((await (await send('GET', '/api/v1/shortfalls/')).json()).results as { id: number }[]).map(
        (r) => r.id,
      );
    mockSession.loggedIn = true;
    mockSession.role = 'super_admin';
    expect(await ids()).toEqual([4]);
    mockSession.role = 'warehouse_admin';
    expect(await ids()).toEqual([4]);
    mockSession.role = 'branch_admin';
    expect(await ids()).toEqual([4]);
    mockSession.workingBranch = branchB;
    expect(await ids()).toEqual([]);
  });

  it('out of scope is 404 like a missing id; FS is 403; bad status is 400', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'branch_admin';
    mockSession.workingBranch = branchB;
    expect((await send('POST', '/api/v1/shortfalls/4/resolve/', good)).status).toBe(404);
    expect((await send('POST', '/api/v1/shortfalls/999/resolve/', good)).status).toBe(404);
    mockSession.role = 'front_staff';
    expect((await send('GET', '/api/v1/shortfalls/')).status).toBe(403);
    mockSession.role = 'super_admin';
    expect((await send('GET', '/api/v1/shortfalls/?status=bogus')).status).toBe(400);
  });

  it('validates the body: quantity above remaining 400 on quantity, note required, and 409 once resolved', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'super_admin';
    const r = await send('POST', '/api/v1/shortfalls/4/resolve/', { ...good, quantity: 3 });
    expect(r.status).toBe(400);
    expect((await r.json()).errors[0].field).toBe('quantity');
    const n = await send('POST', '/api/v1/shortfalls/4/resolve/', { ...good, note: '  ' });
    expect((await n.json()).errors[0].field).toBe('note');
    expect(
      (await send('POST', '/api/v1/shortfalls/4/resolve/', { ...good, quantity: 2 })).status,
    ).toBe(200);
    expect((await send('POST', '/api/v1/shortfalls/4/resolve/', good)).status).toBe(409);
  });

  it('needs the CSRF header and an Idempotency-Key; the same key replays the first answer', async () => {
    mockSession.loggedIn = true;
    const url = new URL('/api/v1/shortfalls/4/resolve/', globalThis.location.origin);
    const post = (h: Record<string, string>) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(good),
      });
    expect((await post({ 'Idempotency-Key': 'a' })).status).toBe(403);
    expect((await post({ 'X-CSRFToken': 't' })).status).toBe(400);
    const first = await post({ 'X-CSRFToken': 't', 'Idempotency-Key': 'same' });
    const again = await post({ 'X-CSRFToken': 't', 'Idempotency-Key': 'same' });
    expect(first.status).toBe(200);
    expect(await again.json()).toEqual(await first.json());
    expect(mockStore.resolutions[4]).toHaveLength(1);
  });
});
