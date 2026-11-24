import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { meByRole } from './mocks/data';
import { mockSession, mockStore } from './mocks/handlers';
import { server } from './mocks/server';
import { apiError, capture, click, type } from './test/helpers';
import { renderApp } from './test/renderApp';

const send = (method: string, path: string, headers: Record<string, string> = {}, body?: unknown) =>
  fetch(new URL(path, globalThis.location.origin), {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const without = (role: 'warehouse_admin' | 'branch_admin', drop: string[]) =>
  server.use(
    http.get('/api/v1/auth/me/', () =>
      HttpResponse.json({
        ...meByRole[role],
        permissions: meByRole[role].permissions.filter((p) => !drop.includes(p)),
      }),
    ),
  );

describe('FIX-33 receipts carry cost, so only cost roles may read them', () => {
  it.each(['branch_admin', 'front_staff'] as const)(
    '%s gets 403 on the list and one receipt',
    async (role) => {
      mockSession.loggedIn = true;
      mockSession.role = role;
      expect((await send('GET', '/api/v1/goods-receipts/')).status).toBe(403);
      expect((await send('GET', '/api/v1/goods-receipts/1/')).status).toBe(403);
    },
  );
  it('the Warehouse Admin still reads them', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'warehouse_admin';
    expect((await send('GET', '/api/v1/goods-receipts/1/')).status).toBe(200);
  });
});

describe('receiving screen fixes', () => {
  const open = async () => {
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
  };

  it('FIX-34 a 409 on the decision reloads the delivery and shows its outcome, with no Confirm button', async () => {
    server.use(
      http.post('/api/v1/dispatches/1/receive/', () => {
        mockStore.dispatches[0].status = 'completed';
        return apiError(409, 'already_decided', 'This delivery already has a decision.');
      }),
    );
    await open();
    click('Review delivery');
    click('Confirm receipt');
    expect(await screen.findByText('Completed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirm receipt' })).toBeNull();
  });

  it('FIX-35 a count above what was sent is stopped on its line, with no confirm step and no request', async () => {
    const cap = capture('post', '/api/v1/dispatches/1/receive/', () => apiError(500, 'x', 'x'));
    server.use(cap.handler);
    await open();
    type('Received: HP 250 G9', '9');
    click('Review delivery');
    expect(screen.getByText('More than the 2 that were sent.')).toBeTruthy();
    expect(screen.getByLabelText('Received: HP 250 G9').getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Confirm receipt' })).toBeNull();
    expect(cap.seen).toHaveLength(0);
  });

  it('FIX-36 a rejection with a blank reason is stopped with a message and sends nothing', async () => {
    const cap = capture('post', '/api/v1/dispatches/1/receive/', () => apiError(500, 'x', 'x'));
    server.use(cap.handler);
    await open();
    click('Reject delivery');
    type('Reason for rejecting', '   ');
    click('Confirm rejection');
    expect(screen.getByText('Give a reason for rejecting.')).toBeTruthy();
    expect(cap.seen).toHaveLength(0);
  });
});

describe('dispatch fixes', () => {
  const addHp = async (quantity: string) => {
    fireEvent.change(await screen.findByLabelText('Destination branch'), {
      target: { value: '2' },
    });
    type('Find an item in the warehouse', 'HP');
    click('Search');
    fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
    type('Quantity: HP 250 G9', quantity);
  };

  it('FIX-37 a quantity above what is available is warned about on the line; the server still decides', async () => {
    renderApp('/dispatches/new', { as: 'warehouse_admin' });
    await addHp('50');
    expect(screen.getByText('More than the 10 available. The server may refuse it.')).toBeTruthy();
    click('Review dispatch');
    expect(screen.getByRole('button', { name: 'Confirm dispatch' })).toBeTruthy();
  });

  it('FIX-39 after a confirmed dispatch the success message takes focus', async () => {
    renderApp('/dispatches/new', { as: 'warehouse_admin' });
    await addHp('2');
    click('Review dispatch');
    click('Confirm dispatch');
    const card = await screen.findByRole('status');
    await waitFor(() => expect(document.activeElement).toBe(card));
    expect(card.getAttribute('tabindex')).toBe('-1');
  });

  it('FIX-40 the list needs dispatches.view; New dispatch needs dispatches.create', async () => {
    without('warehouse_admin', ['dispatches.create']);
    renderApp('/dispatches', { as: 'warehouse_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Dispatch' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'New dispatch' })).toBeNull();
  });

  it('FIX-40 without dispatches.view the list is the 403 page', async () => {
    without('warehouse_admin', ['dispatches.view']);
    renderApp('/dispatches', { as: 'warehouse_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });
});

describe('FIX-38 the mock replays an Idempotency-Key like the server', () => {
  const body = { destination_id: 2, lines: [{ item_id: 1, quantity: 1 }] };
  const K = { 'X-CSRFToken': 't', 'Idempotency-Key': 'same-key' };
  it('the same key and body twice make one dispatch and answer the same', async () => {
    mockSession.loggedIn = true;
    const a = await (await send('POST', '/api/v1/dispatches/', K, body)).json();
    const second = await send('POST', '/api/v1/dispatches/', K, body);
    expect(second.status).toBe(201);
    expect((await second.json()).id).toBe(a.id);
    expect(mockStore.dispatches).toHaveLength(4);
  });
  it('the same key with another body is 409 idempotency_conflict', async () => {
    mockSession.loggedIn = true;
    await send('POST', '/api/v1/dispatches/', K, body);
    const res = await send('POST', '/api/v1/dispatches/', K, {
      ...body,
      lines: [{ item_id: 1, quantity: 2 }],
    });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('idempotency_conflict');
    expect(mockStore.dispatches).toHaveLength(4);
  });
});

describe('FIX-39 after a confirmed receipt the success message takes focus', () => {
  it('moves focus to the status card', async () => {
    renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Receive stock' });
    type('Supplier', 'S');
    type('Find an item to receive', 'HP');
    click('Search');
    fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
    type('Quantity: HP 250 G9', '1');
    type('Unit cost (GHS): HP 250 G9', '1');
    click('Review receipt');
    click('Confirm receipt');
    const card = await screen.findByRole('status');
    await waitFor(() => expect(document.activeElement).toBe(card));
  });
});
