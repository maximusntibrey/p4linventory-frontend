import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { components } from '../src/api/schema';
import { sideways, stubAuth, stubData } from './stub';

type S = components['schemas'];
const t = '2026-11-23T14:05:00Z';
const hp = {
  id: 1,
  sku: 'SKU-000001',
  name: 'HP 250 G9',
  category_id: 1,
  subtype_id: 1,
  brand_id: 1,
  brand_name: 'HP',
  model_name: '250 G9',
  mpn: '6S6D3EA',
  condition: 'refurbished',
  grade: 'A',
  unit_of_measure: 'piece',
  status: 'active',
  key_specs: { ram_gb: 8 },
  image_url: null,
  show_on_website: true,
  selling_price: '1250.00',
  average_cost: '900.00',
  created_at: t,
  updated_at: t,
} satisfies S['ItemWithCost'];
const page1 = <T>(results: T[]) => ({
  count: results.length,
  page: 1,
  page_size: 25,
  next: null,
  previous: null,
  results,
});

/** Items, categories, brands, field definitions and stock for the F4 screens. A created item shows up afterwards. */
async function stubItems(page: Page) {
  const items: S['ItemWithCost'][] = [hp];
  await page.route('**/api/v1/item-categories/', (r) =>
    r.fulfill({
      json: [{ id: 1, name: 'Laptop', subtypes: [{ id: 1, name: 'Business laptop' }] }],
    }),
  );
  await page.route('**/api/v1/brands/', (r) =>
    r.fulfill({ json: [{ id: 1, name: 'HP', is_active: true }] }),
  );
  await page.route('**/api/v1/item-field-definitions/**', (r) =>
    r.fulfill({
      json: [
        {
          key: 'ram_gb',
          label: 'RAM (GB)',
          type: 'integer',
          required: true,
          group: 'Memory',
          in_key_specs: true,
        },
      ] satisfies S['ItemFieldDefinition'][],
    }),
  );
  await page.route('**/api/v1/costed-items/**', (r) => {
    const id = Number(new URL(r.request().url()).pathname.split('/').filter(Boolean).at(-1));
    const one = items.find((i) => i.id === id);
    return r.fulfill(one ? { json: one } : { json: page1(items) });
  });
  await page.route('**/api/v1/items/**', (r) => {
    const req = r.request();
    if (req.method() === 'POST') {
      const b = req.postDataJSON() as Partial<S['ItemWrite']>;
      const made = {
        ...hp,
        id: 2,
        sku: 'SKU-000002',
        name: b.name ?? '',
        status: 'draft',
        average_cost: null,
        selling_price: null,
        key_specs: b.key_specs ?? {},
      } satisfies S['ItemWithCost'];
      items.push(made);
      return r.fulfill({ status: 201, json: { ...made, warnings: [] } });
    }
    return r.fulfill({ json: page1(items) });
  });
  await page.route('**/api/v1/stock/**', (r) =>
    r.fulfill({
      json: page1([
        {
          location_id: 1,
          location_name: 'Central Warehouse',
          item_id: 1,
          sku: 'SKU-000001',
          item_name: 'HP 250 G9',
          on_hand: 12,
          reserved: 2,
          available: 10,
          quarantined: 0,
          reorder_level: 5,
          low_stock: true,
        },
        {
          location_id: 3,
          location_name: 'Kumasi Branch',
          item_id: 1,
          sku: 'SKU-000001',
          item_name: 'HP 250 G9',
          on_hand: 2,
          reserved: 2,
          available: 0,
          quarantined: 0,
          reorder_level: null,
          low_stock: false,
        },
      ] satisfies S['StockBalance'][]),
    }),
  );
}

async function setup(page: Page) {
  await stubAuth(page, { signedIn: true });
  await stubData(page);
  await stubItems(page);
}

const tall = async (loc: Locator) =>
  expect((await loc.boundingBox())!.height).toBeGreaterThanOrEqual(44);

test('item list: cards, cost from the API, labelled actions, no sideways scroll', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/items');
  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'HP 250 G9' })).toBeVisible();
  await expect(page.getByText('Average cost: GHS 900.00')).toBeVisible();
  await expect(page.getByRole('listitem').getByText('Active', { exact: true })).toBeVisible();
  await tall(page.getByRole('link', { name: 'Add an item' }));
  await tall(page.getByRole('button', { name: 'Search', exact: true }));
  await tall(page.getByRole('link', { name: 'HP 250 G9' }));
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('add an item with the keyboard, save as Draft, then see the picture messages', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/items/new');
  await expect(page.getByRole('heading', { level: 1, name: 'Add an item' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Laptop' })).toBeAttached();
  await expect(page.getByRole('option', { name: 'HP' })).toBeAttached();
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  // Required fields: Enter in the name field submits the form and the messages appear.
  await page.getByLabel('Name').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Enter the item name.')).toBeVisible();
  await expect(page.getByText('Choose a category.')).toBeVisible();

  await page.getByLabel('Name').fill('Lenovo T14');
  await page.getByLabel('Category').selectOption({ label: 'Laptop' });
  await expect(page.getByLabel('RAM (GB)')).toBeVisible();
  await expect(page.getByText('Needed to activate this item.')).toBeVisible();
  await page.getByLabel('Type').selectOption({ label: 'Business laptop' });
  await page.getByLabel('Brand').selectOption({ label: 'HP' });
  await page.getByLabel('Model').fill('T14 G3');
  await page.getByLabel('Part number (MPN)').fill('21AH');
  await page.getByLabel('Condition').selectOption({ label: 'Used' });
  await page.getByLabel('Selling price (GHS)').fill('-1');
  await page.getByLabel('Selling price (GHS)').press('Enter');
  await expect(page.getByText(/It cannot be negative/)).toBeVisible();
  await page.getByLabel('Selling price (GHS)').fill('2500');
  await page.getByLabel('RAM (GB)').fill('abc');
  await page.getByLabel('RAM (GB)').press('Enter');
  await expect(page.getByText('Enter a whole number.')).toBeVisible();
  await page.getByLabel('RAM (GB)').fill('16');
  for (const label of ['Name', 'Category', 'Type', 'Brand', 'Model', 'Condition', 'RAM (GB)']) {
    await tall(page.getByLabel(label, { exact: true }));
  }
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.getByLabel('RAM (GB)').press('Enter');

  await expect(page.getByRole('heading', { level: 1, name: 'Lenovo T14' })).toBeVisible();
  await expect(page.getByText('Lenovo T14 was saved as a Draft.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate item' })).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  // Picture: a wrong type and a too-big file are explained before anything is sent.
  const input = page.getByLabel('Add a picture');
  await input.setInputFiles({
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('x'),
  });
  await expect(
    page.getByText('This file type is not allowed. Use a JPEG, PNG or WebP picture.'),
  ).toBeVisible();
  await input.setInputFiles({
    name: 'big.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(6 * 1024 * 1024),
  });
  await expect(page.getByText('This picture is 6.0 MB. The most allowed is 5 MB.')).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('stock screen: grouped by location, stock words with icons, no sideways scroll', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/stock');
  await expect(page.getByRole('heading', { level: 1, name: 'Stock' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Central Warehouse' })).toBeVisible();
  await expect(page.getByText('Low', { exact: true })).toBeVisible();
  await expect(page.getByText('Out of stock')).toBeVisible();
  await tall(page.getByRole('button', { name: 'Search', exact: true }));
  await tall(page.getByLabel('Location'));
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('Front Staff with no branch signs in and gets the branch picker, not the dashboard', async ({
  page,
}) => {
  await stubAuth(page, { frontStaff: true });
  await stubData(page);
  await page.goto('/login');
  await page.getByLabel('Login ID').fill('USR-0003');
  await page.getByLabel('Password').fill('a-good-password');
  await page.getByLabel('Password').press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Choose your branch' })).toBeVisible();
  await expect(page.getByRole('banner').getByText('No branch selected')).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const accra = page.getByRole('button', { name: 'Accra Branch' });
  await tall(accra);
  await accra.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('banner').getByText('Accra Branch')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose your branch' })).toHaveCount(0);
});
