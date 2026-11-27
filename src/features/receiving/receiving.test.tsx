import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { dispatch, meByRole } from '../../mocks/data';
import { mockStore } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { apiError, capture, click, type, where } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name });
const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;
/** The server's side of a finished decision, so the screen's refetch agrees with the reply. */
const completed = () => {
  mockStore.dispatches[0].status = 'completed';
  return HttpResponse.json({ ...dispatch, status: 'completed' });
};
const decided = () =>
  http.post('/api/v1/dispatches/1/receive/', async ({ request }) => {
    seen.push(await request.json());
    return completed();
  });
let seen: unknown[] = [];

describe('waiting at a branch (F5.3, F5.4)', () => {
  it('Branch Admin sees only what is in transit to the working branch; axe clean', async () => {
    const { container } = renderApp('/receive', { as: 'branch_admin' });
    await h1('Receive');
    expect(await screen.findByText('Waiting at Accra Branch')).toBeTruthy();
    expect(await screen.findByText('TRF-000001')).toBeTruthy();
    expect(screen.getByText('In transit')).toBeTruthy();
    expect(screen.getByText(/7 units in 2 lines/)).toBeTruthy();
    // To Kumasi, and one already received: neither is waiting at Accra.
    expect(screen.queryByText('TRF-000002')).toBeNull();
    expect(screen.queryByText('TRF-000003')).toBeNull();
    expect(screen.getByRole('link', { name: 'Check delivery TRF-000001' }).className).toMatch(
      /min-h-(11|target)/,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the Super Admin has no working branch, so is asked for one; the API gets that branch_id', async () => {
    renderApp('/receive', { as: 'super_admin' });
    await h1('Receive');
    expect(screen.getByText('Choose a branch to see what is waiting there.')).toBeTruthy();
    fireEvent.change(await screen.findByLabelText('Branch'), { target: { value: '3' } });
    expect(await screen.findByText('Waiting at Kumasi Branch')).toBeTruthy();
    expect(await screen.findByText('TRF-000002')).toBeTruthy();
    expect(screen.queryByText('TRF-000001')).toBeNull();
  });

  it('says so when nothing is waiting', async () => {
    mockStore.dispatches = [];
    renderApp('/receive', { as: 'front_staff' });
    expect(await screen.findByText('Nothing is waiting to be received')).toBeTruthy();
  });

  it('the Warehouse Admin has no receiving screen (the API gives no dispatches.waiting)', async () => {
    renderApp('/receive', { as: 'warehouse_admin' });
    expect(await h1('403: Not allowed')).toBeTruthy();
  });

  it('opens a delivery from the list', async () => {
    renderApp('/receive', { as: 'branch_admin' });
    fireEvent.click(await screen.findByRole('link', { name: 'Check delivery TRF-000001' }));
    expect(await h1('Check delivery')).toBeTruthy();
    expect(where()).toBe('/receive/1');
  });
});

describe('receiving a delivery (F5.3)', () => {
  it('starts with every quantity filled in as sent, with labelled 44 px fields; axe clean', async () => {
    const { container } = renderApp('/receive/1', { as: 'branch_admin' });
    await h1('Check delivery');
    await screen.findByLabelText('Received: HP 250 G9');
    expect(value('Received: HP 250 G9')).toBe('2');
    expect(value('Received: Dell 65W charger')).toBe('5');
    expect(screen.getByText('Sent: 5')).toBeTruthy();
    expect((screen.getByLabelText('Received: HP 250 G9') as HTMLInputElement).className).toMatch(
      /min-h-(11|target)/,
    );
    expect(screen.queryByLabelText('Note about the shortfall')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a shortfall is highlighted with icon and words, and needs a note', async () => {
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    type('Received: Dell 65W charger', '3');
    const line = screen.getByLabelText('Received: Dell 65W charger').closest('li')!;
    expect(within(line).getByText('Short by 2')).toBeTruthy();
    expect(line.className).toContain('border-warn');
    expect(line.querySelector('svg')).not.toBeNull();
    expect(screen.getByLabelText('Received: HP 250 G9').closest('li')!.className).not.toContain(
      'border-warn',
    );
    click('Review delivery');
    expect(screen.getByText('Add a note about the shortfall.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirm receipt' })).toBeNull();
  });

  it('partial: sends approve_partial with the note and every line, then shows the outcome', async () => {
    seen = [];
    server.use(decided());
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    type('Received: Dell 65W charger', '3');
    type('Note about the shortfall', 'Two chargers missing');
    click('Review delivery');
    expect(screen.getByText(/Receive 5 of 7 units \(short by 2\)/)).toBeTruthy();
    click('Confirm receipt');
    await screen.findByText('Completed'); // the stubbed reply
    expect(seen).toEqual([
      {
        decision: 'approve_partial',
        note: 'Two chargers missing',
        lines: [
          { line_id: 1, qty_received: 2, qty_accepted: 2 },
          { line_id: 2, qty_received: 3, qty_accepted: 3 },
        ],
      },
    ]);
  });

  it('partial through the mock: the outcome lists sent, received, accepted and the short line; stock moves', async () => {
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    type('Received: Dell 65W charger', '3');
    type('Note about the shortfall', 'Two chargers missing');
    click('Review delivery');
    click('Confirm receipt');
    expect(await screen.findByText('Partially received')).toBeTruthy();
    const line = screen.getByText('Dell 65W charger').closest('li')!;
    expect(within(line).getByText(/Sent 5 · Received 3 · Accepted 3/)).toBeTruthy();
    expect(within(line).getByText('Short by 2')).toBeTruthy();
    expect(screen.getByText('Note: Two chargers missing')).toBeTruthy();
    expect(screen.getByText('The shortfall stays open until it is resolved.')).toBeTruthy();
    expect(screen.queryByLabelText('Received: HP 250 G9')).toBeNull();
    const accra = mockStore.stock.find((r) => r.location_id === 2 && r.item_id === 1)!;
    expect(accra.on_hand).toBe(5);
  });

  it('"Received all" puts every quantity back to what was sent, and receiving in full sends approve_all', async () => {
    seen = [];
    server.use(decided());
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    type('Received: HP 250 G9', '0');
    type('Received: Dell 65W charger', '1');
    expect(screen.getByLabelText('Note about the shortfall')).toBeTruthy();
    click('Received all');
    expect(value('Received: HP 250 G9')).toBe('2');
    expect(value('Received: Dell 65W charger')).toBe('5');
    expect(screen.queryByLabelText('Note about the shortfall')).toBeNull();
    expect(screen.queryByText(/Short by/)).toBeNull();
    click('Review delivery');
    click('Confirm receipt');
    await screen.findByText('Completed');
    expect(seen).toEqual([
      {
        decision: 'approve_all',
        lines: [
          { line_id: 1, qty_received: 2, qty_accepted: 2 },
          { line_id: 2, qty_received: 5, qty_accepted: 5 },
        ],
      },
    ]);
  });

  it('receiving in full through the mock completes the delivery', async () => {
    renderApp('/receive/1', { as: 'front_staff' });
    await screen.findByLabelText('Received: HP 250 G9');
    click('Review delivery');
    click('Confirm receipt');
    expect(await screen.findByText('Completed')).toBeTruthy();
    expect(screen.queryByText(/Short by/)).toBeNull();
  });

  it('whole-delivery rejection needs a reason, sends reject, and shows Rejected', async () => {
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    click('Reject delivery');
    expect(screen.getByLabelText('Received: HP 250 G9').hasAttribute('disabled')).toBe(true);
    click('Confirm rejection');
    expect((await screen.findAllByText('Give a reason for rejecting.')).length).toBeGreaterThan(0);
    type('Reason for rejecting', 'Wrong goods');
    click('Confirm rejection');
    expect(await screen.findByText('Rejected')).toBeTruthy();
    expect(screen.getByText('Note: Wrong goods')).toBeTruthy();
  });

  it('Cancel on the confirm step goes back without sending anything', async () => {
    seen = [];
    server.use(decided());
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    click('Review delivery');
    click('Cancel');
    expect(screen.getByRole('button', { name: 'Review delivery' })).toBeTruthy();
    expect(seen).toEqual([]);
  });

  it('puts a count the API refuses on its line (the screen cannot know every rule)', async () => {
    server.use(
      http.post('/api/v1/dispatches/1/receive/', () =>
        apiError(400, 'validation_error', 'Check the highlighted fields.', [
          { field: 'lines.0.qty_received', message: 'That count does not match the dispatch.' },
        ]),
      ),
    );
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    click('Review delivery');
    click('Confirm receipt');
    expect(
      (await screen.findAllByText('That count does not match the dispatch.')).length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText('Received: HP 250 G9').getAttribute('aria-invalid')).toBe('true');
  });

  it('a count that is not a number is stopped with a message before anything is sent', async () => {
    seen = [];
    server.use(decided());
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    type('Received: HP 250 G9', 'two');
    click('Review delivery');
    expect(screen.getByText('Enter a whole number, 0 or more.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirm receipt' })).toBeNull();
    expect(seen).toEqual([]);
  });

  it('a second decision is refused by the API and shown in its words', async () => {
    server.use(
      http.post('/api/v1/dispatches/1/receive/', () =>
        apiError(409, 'already_decided', 'This delivery already has a decision.'),
      ),
    );
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    click('Review delivery');
    click('Confirm receipt');
    expect((await screen.findByRole('alert')).textContent).toContain(
      'This delivery already has a decision.',
    );
  });

  it('sends one request with an Idempotency-Key on a double click; a retry after failure reuses the key', async () => {
    let n = 0;
    const cap = capture('post', '/api/v1/dispatches/1/receive/', () =>
      ++n === 1 ? apiError(409, 'conflict', 'Try again in a moment.') : completed(),
    );
    server.use(cap.handler);
    renderApp('/receive/1', { as: 'branch_admin' });
    await screen.findByLabelText('Received: HP 250 G9');
    click('Review delivery');
    const confirm = screen.getByRole('button', { name: 'Confirm receipt' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await screen.findByText('Try again in a moment.');
    expect(cap.seen).toHaveLength(1);
    expect(cap.seen[0].key).toMatch(/^[0-9a-f-]{36}$/);
    click('Confirm receipt');
    await screen.findByText('Completed');
    expect(cap.seen).toHaveLength(2);
    expect(cap.seen[1].key).toBe(cap.seen[0].key);
  });

  it('a delivery already decided shows its outcome, with the shortfall highlighted and no form', async () => {
    renderApp('/receive/3', { as: 'branch_admin' });
    expect(await screen.findByText('Partially received')).toBeTruthy();
    expect(screen.getByText(/Sent 5 · Received 3 · Accepted 3/)).toBeTruthy();
    expect(screen.getByText('Short by 2').closest('li')!.className).toContain('border-warn');
    expect(screen.getByText('Note: Two boxes did not arrive.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Review delivery' })).toBeNull();
  });

  it('the form is shown only when /me lists dispatches.receive', async () => {
    server.use(
      http.get('/api/v1/auth/me/', () =>
        HttpResponse.json({
          ...meByRole.branch_admin,
          permissions: meByRole.branch_admin.permissions.filter((p) => p !== 'dispatches.receive'),
        }),
      ),
    );
    renderApp('/receive/1', { as: 'branch_admin' });
    expect(await screen.findByText('In transit')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Review delivery' })).toBeNull();
    expect(screen.queryByLabelText('Received: HP 250 G9')).toBeNull();
  });

  it("another branch's delivery is the API's 403, shown as not allowed", async () => {
    renderApp('/receive/2', { as: 'branch_admin' });
    expect(await h1('403: Not allowed')).toBeTruthy();
  });
});
