import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { costedItems, meByRole } from '../../mocks/data';
import { server } from '../../mocks/server';
import { apiError, capture, click, type, where } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

/** Records each request that reaches `path`, then lets the default mock answer. */
function spy(method: 'post' | 'put' | 'patch', path: string) {
  const seen: { key: string | null; type: string | null; body: unknown }[] = [];
  const handler = http[method](path, async ({ request }) => {
    const type = request.headers.get('Content-Type');
    seen.push({
      key: request.headers.get('Idempotency-Key'),
      type,
      body: type?.includes('json') ? await request.clone().json() : null,
    });
  });
  return { seen, handler };
}
const h1 = (name: string) => screen.findByRole('heading', { level: 1, name });
const card = (name: string) => screen.getByRole('link', { name }).closest('tr')!;

/** Fills the always-shown fields of the item form with a valid laptop. */
async function fillBasics(over: { name?: string; model?: string } = {}) {
  await screen.findByRole('option', { name: 'Laptop' });
  type('Name', over.name ?? 'HP ProBook 450');
  type('Category', '1');
  await screen.findByRole('option', { name: 'Business laptop' });
  type('Type', '1');
  type('Brand', '1');
  type('Model', over.model ?? '450 G10');
  type('Part number (MPN)', '85A74EA');
  type('Condition', 'refurbished');
  await screen.findByLabelText('RAM (GB)');
}

describe('item list', () => {
  it('shows each item as a table row with status as text + icon and cost when the API sends it; axe clean', async () => {
    const { container } = renderApp('/items', { as: 'super_admin' });
    await h1('Items');
    const hp = await screen.findByRole('link', { name: 'HP 250 G9' });
    expect(hp).toBeTruthy();
    const active = card('HP 250 G9');
    expect(within(active).getByText('Active')).toBeTruthy();
    expect(active.querySelector('svg')).not.toBeNull();
    expect(within(active).getByText(/SKU-000001 · HP · 250 G9/)).toBeTruthy();
    expect(within(active).getByText('GHS 1250.00')).toBeTruthy();
    expect(within(active).getByText('GHS 900.00')).toBeTruthy();
    const draft = card('Dell 65W charger');
    expect(within(draft).getByText('Draft')).toBeTruthy();
    expect(within(draft).getByText('No selling price yet')).toBeTruthy();
    expect(within(draft).getByText('none yet (no receipt)')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add an item' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a user without the cost permission gets the base list: no cost anywhere, no Add button', async () => {
    renderApp('/items', { as: 'branch_admin' });
    await h1('Items');
    await screen.findByRole('link', { name: 'HP 250 G9' });
    expect(screen.queryByText(/Average cost/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Add an item' })).toBeNull();
  });

  it('shows cost only because the API returned it: a cost list without the field shows none', async () => {
    server.use(
      http.get('/api/v1/costed-items/', () =>
        HttpResponse.json({
          count: 1,
          page: 1,
          page_size: 25,
          next: null,
          previous: null,
          results: [{ ...costedItems[0], average_cost: undefined }],
        }),
      ),
    );
    renderApp('/items', { as: 'super_admin' });
    await screen.findByRole('link', { name: 'HP 250 G9' });
    expect(screen.queryByText(/Average cost/)).toBeNull();
  });

  it('search, category, brand and status are sent to the API and only matches stay', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/costed-items/', ({ request }) => {
        seen.push(new URL(request.url).search);
      }),
    );
    renderApp('/items', { as: 'super_admin' });
    await screen.findByRole('link', { name: 'HP 250 G9' });
    type('Search by name, SKU, brand, model or part number', 'charger');
    click('Search');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'HP 250 G9' })).toBeNull());
    expect(screen.getByRole('link', { name: 'Dell 65W charger' })).toBeTruthy();

    type('Search by name, SKU, brand, model or part number', '');
    type('Status', 'active');
    click('Search');
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Dell 65W charger' })).toBeNull(),
    );
    expect(screen.getByRole('link', { name: 'HP 250 G9' })).toBeTruthy();

    type('Status', '');
    await screen.findByRole('option', { name: 'Accessory' });
    type('Category', '3');
    type('Brand', '2');
    click('Search');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'HP 250 G9' })).toBeNull());
    expect(seen.some((s) => s.includes('category_id=3') && s.includes('brand_id=2'))).toBe(true);
    expect(seen.some((s) => s.includes('status=active'))).toBe(true);
    expect(seen.some((s) => s.includes('q=charger'))).toBe(true);
  });

  it('filters by condition and sends it to the API', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/costed-items/', ({ request }) => {
        seen.push(new URL(request.url).search);
      }),
    );
    renderApp('/items', { as: 'super_admin' });
    await screen.findByRole('link', { name: 'HP 250 G9' });
    type('Condition', 'new');
    click('Search');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'HP 250 G9' })).toBeNull());
    expect(screen.getByRole('link', { name: 'Dell 65W charger' })).toBeTruthy();
    expect(seen.some((s) => s.includes('condition=new'))).toBe(true);
  });

  it('lists deactivated brands in the filter, marked as such', async () => {
    renderApp('/items', { as: 'super_admin' });
    expect(await screen.findByRole('option', { name: 'Acer (deactivated)' })).toBeTruthy();
  });

  it('shows the empty state', async () => {
    renderApp('/items', { as: 'super_admin' });
    await screen.findByRole('link', { name: 'HP 250 G9' });
    type('Search by name, SKU, brand, model or part number', 'no-such-thing');
    click('Search');
    expect(await screen.findByText('No items match')).toBeTruthy();
  });

  it('pages through the API envelope', async () => {
    const asked: (string | null)[] = [];
    server.use(
      http.get('/api/v1/costed-items/', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');
        asked.push(page);
        return HttpResponse.json({
          count: 2,
          page: Number(page ?? 1),
          page_size: 1,
          next: page === '2' ? null : '?page=2',
          previous: page === '2' ? '?page=1' : null,
          results: [costedItems[page === '2' ? 1 : 0]],
        });
      }),
    );
    renderApp('/items', { as: 'super_admin' });
    await screen.findByRole('link', { name: 'HP 250 G9' });
    click('Next');
    expect(await screen.findByRole('link', { name: 'Dell 65W charger' })).toBeTruthy();
    expect(asked).toContain('2');
  });

  it('403 shows the 403 page; a server error offers Try again', async () => {
    server.use(http.get('/api/v1/costed-items/', () => apiError(403, 'permission_denied', 'No.')));
    renderApp('/items', { as: 'super_admin' });
    expect(await h1('403: Not allowed')).toBeTruthy();
  });

  it('a failing list says so in plain words and the retry works', async () => {
    let fail = true;
    server.use(
      http.get('/api/v1/costed-items/', () => {
        if (!fail) return undefined;
        return apiError(500, 'server_error', 'The server had a problem.');
      }),
    );
    renderApp('/items', { as: 'super_admin' });
    expect(await screen.findByText('The server had a problem.')).toBeTruthy();
    fail = false;
    click('Try again');
    expect(await screen.findByRole('link', { name: 'HP 250 G9' })).toBeTruthy();
  });
});

describe('item form: add', () => {
  it('checks the required fields before sending anything', async () => {
    const post = capture('post', '/api/v1/items/', () => HttpResponse.json({}, { status: 201 }));
    server.use(post.handler);
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await screen.findByRole('option', { name: 'Dell' });
    click('Save as Draft');
    for (const m of [
      'Enter the item name.',
      'Choose a category.',
      'Choose a type.',
      'Choose a brand.',
      'Enter the model.',
      'Enter the part number.',
      'Choose the condition.',
    ]) {
      expect(await screen.findByText(m)).toBeTruthy();
    }
    expect(post.seen).toHaveLength(0);
  });

  it('shows only the fields of the chosen category, grouped, and marks those needed to activate', async () => {
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    expect(screen.queryByLabelText('RAM (GB)')).toBeNull();
    await screen.findByRole('option', { name: 'Laptop' });
    type('Category', '1');
    const ram = await screen.findByLabelText('RAM (GB)');
    expect(ram.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getAllByText('Needed to activate this item.')).toHaveLength(1);
    for (const g of ['Memory', 'Storage', 'Display']) {
      expect(screen.getByText(g, { selector: 'summary' })).toBeTruthy();
    }
    expect(screen.getByLabelText('Touchscreen')).toBeTruthy();
    expect(screen.queryByLabelText('Wattage (W)')).toBeNull();

    type('Category', '3');
    expect(await screen.findByLabelText('Wattage (W)')).toBeTruthy();
    expect(screen.queryByLabelText('RAM (GB)')).toBeNull();
    // the type list follows the category
    expect(screen.getByRole('option', { name: 'Charger' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Business laptop' })).toBeNull();
  });

  it('offers only active brands', async () => {
    renderApp('/items/new', { as: 'super_admin' });
    await screen.findByRole('option', { name: 'Dell' });
    expect(screen.queryByRole('option', { name: /Acer/ })).toBeNull();
  });

  it('checks the format of numbers inline', async () => {
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await fillBasics();
    type('RAM (GB)', 'lots');
    type('Screen size (inches)', 'big');
    click('Save as Draft');
    expect(await screen.findByText('Enter a whole number.')).toBeTruthy();
    expect(screen.getByText('Enter a number, for example 15.6.')).toBeTruthy();
    expect(screen.getByLabelText('RAM (GB)').getAttribute('aria-invalid')).toBe('true');
  });

  it('saves as Draft with a key, sends typed specs, and lands on the new item', async () => {
    const post = spy('post', '/api/v1/items/');
    server.use(post.handler);
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await fillBasics();
    type('RAM (GB)', '16');
    type('Screen size (inches)', '15.6');
    type('Storage type', 'SSD');
    fireEvent.click(screen.getByLabelText('Touchscreen'));
    type('Grade', 'B');
    click('Save as Draft');
    expect(await h1('HP ProBook 450')).toBeTruthy();
    expect(where()).toBe('/items/3');
    expect(screen.getByText('HP ProBook 450 was saved as a Draft.')).toBeTruthy();
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
    expect(post.seen).toHaveLength(1);
    expect(post.seen[0].key).toBeTruthy();
    expect(post.seen[0].body).toMatchObject({
      name: 'HP ProBook 450',
      category_id: 1,
      subtype_id: 1,
      brand_id: 1,
      condition: 'refurbished',
      grade: 'B',
      key_specs: { ram_gb: 16, screen_in: 15.6, storage_type: 'SSD', touchscreen: true },
    });
  });

  it('a near-duplicate does not block: the item is saved and the warning is shown with a link', async () => {
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await fillBasics({ name: 'HP 250 G9', model: '250 G9' });
    click('Save as Draft');
    expect(
      await screen.findByText('This item may already exist. It was still saved.'),
    ).toBeTruthy();
    expect(screen.getByText(/Looks the same as SKU-000001/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open that item' }).getAttribute('href')).toBe(
      '/items/1',
    );
    expect(where()).toBe('/items/3');
  });

  it('shows what the API rejected, on the field and in the summary', async () => {
    server.use(
      http.post('/api/v1/items/', () =>
        apiError(400, 'validation_error', 'Check the highlighted fields.', [
          { field: 'mpn', message: 'This part number is not valid.' },
        ]),
      ),
    );
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await fillBasics();
    click('Save as Draft');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getAllByText('This part number is not valid.').length).toBe(2);
    expect(screen.getByLabelText('Part number (MPN)').getAttribute('aria-invalid')).toBe('true');
    expect(where()).toBe('/items/new');
  });

  it('a user the API does not let manage items cannot open the form', async () => {
    renderApp('/items/new', { as: 'branch_admin' });
    expect(await h1('403: Not allowed')).toBeTruthy();
  });

  it('has no axe violations, with the category fields showing', async () => {
    const { container } = renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await fillBasics();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('item page: edit, activate, discontinue', () => {
  it('loads the saved values, saves changes and shows the result', async () => {
    const patch = spy('patch', '/api/v1/items/:id/');
    server.use(patch.handler);
    renderApp('/items/1', { as: 'super_admin' });
    await h1('HP 250 G9');
    await waitFor(() =>
      expect((screen.getByLabelText('RAM (GB)') as HTMLInputElement).value).toBe('8'),
    );
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('HP 250 G9');
    expect((screen.getByLabelText('Brand') as HTMLSelectElement).value).toBe('1');
    expect(screen.getByText('Average cost: GHS 900.00')).toBeTruthy();
    type('Name', 'HP 250 G9 (refurb)');
    click('Save changes');
    expect(await screen.findByText('Changes saved.')).toBeTruthy();
    expect(patch.seen[0].key).toBeTruthy();
    expect(patch.seen[0].body).toMatchObject({
      name: 'HP 250 G9 (refurb)',
      key_specs: { ram_gb: 8 },
    });
    expect(await h1('HP 250 G9 (refurb)')).toBeTruthy();
  });

  it('activates a Draft and shows the new status', async () => {
    renderApp('/items/2', { as: 'super_admin' });
    await h1('Dell 65W charger');
    click('Activate item');
    expect(await screen.findByText('Dell 65W charger is now Active.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Activate item' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Discontinue item' })).toBeTruthy();
  });

  it('reports why the API refused to activate', async () => {
    server.use(
      http.post('/api/v1/items/:id/status/', () =>
        apiError(400, 'validation_error', 'This item cannot be activated yet.', [
          { field: 'image', message: 'Add a picture first.' },
          { field: 'key_specs.wattage', message: 'Wattage is needed.' },
        ]),
      ),
    );
    renderApp('/items/2', { as: 'super_admin' });
    await h1('Dell 65W charger');
    click('Activate item');
    expect(await screen.findByText('This item cannot be activated yet.')).toBeTruthy();
    expect(screen.getByText('Add a picture first.')).toBeTruthy();
    expect(screen.getByText('Wattage is needed.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Activate item' })).toBeTruthy();
  });

  it('discontinuing asks first, and Cancel changes nothing', async () => {
    renderApp('/items/1', { as: 'super_admin' });
    await h1('HP 250 G9');
    click('Discontinue item');
    expect(screen.getByText(/cannot be made active again/)).toBeTruthy();
    click('Cancel');
    expect(screen.queryByText(/cannot be made active again/)).toBeNull();
    click('Discontinue item');
    click(/^Discontinue item$/);
    expect(await screen.findByText('HP 250 G9 is now Discontinued.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Discontinue item' })).toBeNull();
  });

  it('shows the server message when a discontinued item cannot be edited', async () => {
    server.use(
      http.patch('/api/v1/items/:id/', () =>
        apiError(409, 'item_discontinued', 'A discontinued item cannot be edited.'),
      ),
    );
    renderApp('/items/1', { as: 'super_admin' });
    await h1('HP 250 G9');
    await screen.findByLabelText('RAM (GB)');
    click('Save changes');
    expect(await screen.findByText('A discontinued item cannot be edited.')).toBeTruthy();
  });

  it('a user who may only view sees the details and no form, no status buttons, no cost', async () => {
    renderApp('/items/1', { as: 'branch_admin' });
    await h1('HP 250 G9');
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Discontinue item' })).toBeNull();
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.queryByText(/Average cost/)).toBeNull();
    expect(screen.getByText('GHS 1250.00')).toBeTruthy();
  });

  it('a missing item gives a retryable error, not a blank page', async () => {
    renderApp('/items/99', { as: 'super_admin' });
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('hides Add when /me no longer lists items.manage', async () => {
    server.use(
      http.get('/api/v1/auth/me/', () =>
        HttpResponse.json({
          ...meByRole.super_admin,
          permissions: meByRole.super_admin.permissions.filter((p) => p !== 'items.manage'),
        }),
      ),
    );
    renderApp('/items', { as: 'super_admin' });
    await h1('Items');
    expect(screen.queryByRole('link', { name: 'Add an item' })).toBeNull();
  });

  it('has no axe violations on the item page', async () => {
    const { container } = renderApp('/items/2', { as: 'super_admin' });
    await h1('Dell 65W charger');
    await screen.findByLabelText('Wattage (W)');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('item picture', () => {
  const picture = (name: string, type: string, bytes = 10) =>
    new File([new ArrayBuffer(bytes)], name, { type });
  const choose = (file: File) =>
    fireEvent.change(screen.getByLabelText('Add a picture'), { target: { files: [file] } });

  it('says the type is wrong before anything is sent', async () => {
    const put = spy('put', '/api/v1/items/:id/image/');
    server.use(put.handler);
    renderApp('/items/2', { as: 'super_admin' });
    await h1('Dell 65W charger');
    choose(picture('notes.pdf', 'application/pdf'));
    expect(
      await screen.findByText('This file type is not allowed. Use a JPEG, PNG or WebP picture.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload picture' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(put.seen).toHaveLength(0);
  });

  it('says the size is too big before anything is sent', async () => {
    renderApp('/items/2', { as: 'super_admin' });
    await h1('Dell 65W charger');
    choose(picture('big.png', 'image/png', 6 * 1024 * 1024));
    expect(
      await screen.findByText('This picture is 6.0 MB. The most allowed is 5 MB.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Add a picture').getAttribute('aria-invalid')).toBe('true');
  });

  it('uploads a good picture and shows it', async () => {
    const put = spy('put', '/api/v1/items/:id/image/');
    server.use(put.handler);
    renderApp('/items/2', { as: 'super_admin' });
    await h1('Dell 65W charger');
    expect(screen.getByText('No picture yet.')).toBeTruthy();
    choose(picture('front.png', 'image/png'));
    click('Upload picture');
    expect(await screen.findByText('Picture saved.')).toBeTruthy();
    expect(put.seen[0].key).toBeTruthy();
    expect(put.seen[0].type).toMatch(/^multipart\/form-data/);
    expect(screen.getByRole('img', { name: 'Dell 65W charger' }).getAttribute('src')).toBe(
      '/media/items/mock.png',
    );
    expect(screen.getByLabelText('Replace the picture')).toBeTruthy();
  });

  it('shows the server message for a file it refuses (400) and for one that is too large (413)', async () => {
    server.use(
      http.put('/api/v1/items/:id/image/', () =>
        apiError(400, 'validation_error', 'The file is not a real picture.', [
          { field: 'image', message: 'Use a JPEG, PNG or WebP picture.' },
        ]),
      ),
    );
    renderApp('/items/2', { as: 'super_admin' });
    await h1('Dell 65W charger');
    choose(picture('fake.png', 'image/png'));
    click('Upload picture');
    expect(await screen.findByText('The file is not a real picture.')).toBeTruthy();
    expect(screen.getByText('Use a JPEG, PNG or WebP picture.')).toBeTruthy();

    server.use(
      http.put('/api/v1/items/:id/image/', () =>
        apiError(413, 'file_too_large', 'The picture is larger than 5 MB.'),
      ),
    );
    click('Upload picture');
    expect(await screen.findByText('The picture is larger than 5 MB.')).toBeTruthy();
  });

  it('a view-only user sees the picture area without the upload control', async () => {
    renderApp('/items/1', { as: 'branch_admin' });
    await h1('HP 250 G9');
    expect(screen.getByText('No picture yet.')).toBeTruthy();
    expect(screen.queryByLabelText('Add a picture')).toBeNull();
  });

  it('an upload control is keyboard reachable and 44 px tall by class', async () => {
    renderApp('/items/2', { as: 'super_admin' });
    await h1('Dell 65W charger');
    const input = screen.getByLabelText('Add a picture') as HTMLInputElement;
    expect(input.tabIndex).toBeGreaterThanOrEqual(0);
    expect(input.className).toMatch(/min-h-(11|target)/);
  });
});

describe('item form: selling price (prices.manage only)', () => {
  const without = () =>
    server.use(
      http.get('/api/v1/auth/me/', () =>
        HttpResponse.json({
          ...meByRole.super_admin,
          permissions: meByRole.super_admin.permissions.filter((p) => p !== 'prices.manage'),
        }),
      ),
    );

  it('is offered when /me lists prices.manage, rejects a negative or odd price inline, sends two decimals', async () => {
    const post = spy('post', '/api/v1/items/');
    server.use(post.handler);
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await fillBasics();
    type('Selling price (GHS)', '-5');
    click('Save as Draft');
    expect(await screen.findByText(/It cannot be negative/)).toBeTruthy();
    expect(screen.getByLabelText('Selling price (GHS)').getAttribute('aria-invalid')).toBe('true');
    expect(post.seen).toHaveLength(0);
    type('Selling price (GHS)', '1250');
    click('Save as Draft');
    await waitFor(() => expect(post.seen).toHaveLength(1));
    expect(post.seen[0].body).toMatchObject({ selling_price: '1250.00' });
  });

  it('is shown with the saved price on edit', async () => {
    renderApp('/items/1', { as: 'super_admin' });
    await h1('HP 250 G9');
    await waitFor(() =>
      expect((screen.getByLabelText('Selling price (GHS)') as HTMLInputElement).value).toBe(
        '1250.00',
      ),
    );
  });

  it('is hidden without prices.manage, and selling_price is never sent, on create or edit', async () => {
    without();
    const post = spy('post', '/api/v1/items/');
    const patch = spy('patch', '/api/v1/items/:id/');
    server.use(post.handler, patch.handler);
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await fillBasics();
    expect(screen.queryByLabelText('Selling price (GHS)')).toBeNull();
    click('Save as Draft');
    await waitFor(() => expect(post.seen).toHaveLength(1));
    expect(post.seen[0].body).not.toHaveProperty('selling_price');
    await h1('HP ProBook 450');

    renderApp('/items/1', { as: 'super_admin' });
    await screen.findByLabelText('RAM (GB)');
    expect(screen.queryByLabelText('Selling price (GHS)')).toBeNull();
    click('Save changes');
    await waitFor(() => expect(patch.seen).toHaveLength(1));
    expect(patch.seen[0].body).not.toHaveProperty('selling_price');
  });

  it('shows what the API says about a refused price', async () => {
    server.use(
      http.post('/api/v1/items/', () =>
        apiError(403, 'permission_denied', 'You may not set prices.', [
          { field: 'selling_price', message: 'Not allowed to set the price.' },
        ]),
      ),
    );
    renderApp('/items/new', { as: 'super_admin' });
    await h1('Add an item');
    await fillBasics();
    type('Selling price (GHS)', '10');
    click('Save as Draft');
    expect(await screen.findByText('You may not set prices.')).toBeTruthy();
  });
});
