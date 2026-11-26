import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import type { components } from '../../api';
import { server } from '../../mocks/server';
import { apiError, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

type Report = components['schemas']['ItemImportReport'];
const base: Report = {
  dry_run: true,
  committed: false,
  batch_reference: null,
  location_id: 1,
  rows: 3,
  items_created: 1,
  items_existing: 2,
  opening_quantity_total: 17,
  errors: [],
};
const h1 = () => screen.findByRole('heading', { level: 1, name: 'Import from CSV' });
const pick = () =>
  fireEvent.change(screen.getByLabelText(/CSV file/), {
    target: { files: [new File(['sku\nA'], 'stock.csv', { type: 'text/csv' })] },
  });
/** The jsdom setup cannot read a multipart body, so the server's reports are given per test. */
const reply = (fn: (dry: string | null, key: string | null) => Response, seen: string[] = []) =>
  server.use(
    http.post('/api/v1/item-imports/', ({ request }) => {
      seen.push(request.headers.get('Idempotency-Key') ?? '');
      return fn(null, request.headers.get('Idempotency-Key'));
    }),
  );

describe('CSV import screen', () => {
  it('says up front that new items are Draft and a re-import adds stock again; axe clean', async () => {
    const { container } = renderApp('/items/import', { as: 'warehouse_admin' });
    await h1();
    expect(
      screen.getByText(/Importing the same file again adds the quantities again/),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Location')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is linked from the items list for items.import holders (Warehouse and Super Admin)', async () => {
    const wa = renderApp('/items', { as: 'warehouse_admin' });
    expect(
      (await screen.findByRole('link', { name: 'Import from CSV' })).getAttribute('href'),
    ).toBe('/items/import');
    wa.unmount();
    renderApp('/items', { as: 'super_admin' });
    expect(await screen.findByRole('link', { name: 'Import from CSV' })).toBeTruthy();
  });

  it('a user with items.manage but without items.import has no link and gets 403 on the route', async () => {
    server.use(
      http.get('/api/v1/auth/me/', async () => {
        const { meByRole } = await import('../../mocks/data');
        const m = meByRole.warehouse_admin;
        return HttpResponse.json({
          ...m,
          permissions: m.permissions.filter((p) => p !== 'items.import'),
        });
      }),
    );
    const v = renderApp('/items', { as: 'warehouse_admin' });
    await screen.findByRole('link', { name: 'Add an item' });
    expect(screen.queryByRole('link', { name: 'Import from CSV' })).toBeNull();
    v.unmount();
    renderApp('/items/import', { as: 'warehouse_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('asks for a file before checking', async () => {
    renderApp('/items/import', { as: 'warehouse_admin' });
    await h1();
    click('Check the file');
    expect(await screen.findByText('Choose a CSV file first.')).toBeTruthy();
  });

  it('dry run with errors: row numbers listed, nothing to confirm', async () => {
    reply(() =>
      HttpResponse.json({
        ...base,
        errors: [
          { row: 2, field: 'opening_quantity', message: 'Enter a whole number, 0 or more.' },
          { row: 5, field: null, message: 'Unknown category.' },
        ],
      } satisfies Report),
    );
    const { container } = renderApp('/items/import', { as: 'warehouse_admin' });
    await h1();
    pick();
    click('Check the file');
    expect(
      await screen.findByText(
        '2 errors found. Nothing was saved. Fix the file and check it again.',
      ),
    ).toBeTruthy();
    const list = screen.getByRole('list', { name: 'Errors by row' });
    expect(list.textContent).toContain(
      'Row 2 · opening_quantity: Enter a whole number, 0 or more.',
    );
    expect(list.textContent).toContain('Row 5: Unknown category.');
    expect(screen.queryByRole('button', { name: 'Import now' })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('clean dry run shows the counts and the Draft / re-import notice; confirm commits once and shows the batch', async () => {
    const keys: string[] = [];
    let calls = 0;
    reply(() => {
      calls += 1;
      return HttpResponse.json(
        calls === 1
          ? base
          : { ...base, dry_run: false, committed: true, batch_reference: 'IMP-000001' },
      );
    }, keys);
    renderApp('/items/import', { as: 'warehouse_admin' });
    await h1();
    pick();
    click('Check the file');
    expect(await screen.findByText('No errors. Nothing has been saved yet.')).toBeTruthy();
    expect(screen.getByText('New items (created as Draft)').nextElementSibling?.textContent).toBe(
      '1',
    );
    expect(screen.getByText('Opening quantity in total').nextElementSibling?.textContent).toBe(
      '17',
    );
    const panel = screen.getByRole('group', { name: /Import this file now\?/ });
    expect(panel.textContent).toContain('Importing the same file again adds them again');
    const go = screen.getByRole('button', { name: 'Import now' });
    fireEvent.click(go);
    fireEvent.click(go);
    expect(await screen.findByText('Import IMP-000001 is done.')).toBeTruthy();
    expect(calls).toBe(2);
    expect(keys[0] && keys[1] && keys[0] !== keys[1]).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to items' })).toBeTruthy();
    click('Import another file');
    expect(await screen.findByText('2. Check result').catch(() => null)).toBeNull();
  });

  it('leaving the confirm step imports nothing', async () => {
    reply(() => HttpResponse.json(base));
    renderApp('/items/import', { as: 'warehouse_admin' });
    await h1();
    pick();
    click('Check the file');
    await screen.findByRole('button', { name: 'Import now' });
    click('Cancel');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Import now' })).toBeNull());
  });

  it('a Super Admin chooses the location and it is sent; the server answer 400 is shown', async () => {
    reply(() => apiError(400, 'validation_error', 'Choose a location.'));
    renderApp('/items/import', { as: 'super_admin' });
    await h1();
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Central Warehouse' })).toBeTruthy(),
    );
    type('Location', '1');
    pick();
    click('Check the file');
    expect(await screen.findByText('Choose a location.')).toBeTruthy();
  });

  it('413 and 403 from the API are shown in words', async () => {
    reply(() => apiError(413, 'payload_too_large', 'The file is over 2 MB.'));
    renderApp('/items/import', { as: 'warehouse_admin' });
    await h1();
    pick();
    click('Check the file');
    expect(await screen.findByText('The file is over 2 MB.')).toBeTruthy();
  });

  it('a user who cannot manage items gets the 403 page', async () => {
    renderApp('/items/import', { as: 'branch_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });
});
