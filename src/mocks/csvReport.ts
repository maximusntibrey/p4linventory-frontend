import type { components } from '../api/schema';

type Report = components['schemas']['ItemImportReport'];
type Err = Report['errors'][number];

/** Minimal CSV split (no quoted commas); enough for the mock's sample files. */
const cells = (line: string) => line.split(',').map((c) => c.trim());
const dataLines = (text: string) => text.split(/\r?\n/).filter((l) => l.trim() !== '');

/** The data rows of a CSV as header-keyed objects (row 1 is the header). */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = dataLines(text);
  const header = cells(lines[0] ?? '');
  return lines.slice(1).map((l) => Object.fromEntries(cells(l).map((c, k) => [header[k], c])));
}

/**
 * The mock's version of the server's dry-run check, following the contract text of /item-imports/:
 * `opening_quantity` and `unit_cost` required; an existing SKU is reused; a new SKU needs `name`,
 * `category` and `condition` and is created as Draft. Row 1 is the header. Pure, so it is unit tested.
 */
export function checkCsv(
  text: string,
  knownSkus: string[],
): Pick<Report, 'rows' | 'items_created' | 'items_existing' | 'opening_quantity_total' | 'errors'> {
  const lines = dataLines(text);
  const header = cells(lines[0] ?? '');
  const errors: Err[] = [];
  for (const col of ['opening_quantity', 'unit_cost']) {
    if (!header.includes(col)) errors.push({ row: 1, field: col, message: 'Column is missing.' });
  }
  let created = 0;
  let existing = 0;
  let total = 0;
  const seen = new Set<string>();
  lines.slice(1).forEach((line, i) => {
    const row = i + 2;
    const v = Object.fromEntries(cells(line).map((c, k) => [header[k], c]));
    const qty = v.opening_quantity ?? '';
    if (!/^\d+$/.test(qty))
      errors.push({ row, field: 'opening_quantity', message: 'Enter a whole number, 0 or more.' });
    else total += Number(qty);
    if (!/^\d+(\.\d{1,2})?$/.test(v.unit_cost ?? ''))
      errors.push({ row, field: 'unit_cost', message: 'Enter a cost such as 900.00.' });
    const sku = v.sku ?? '';
    if (sku) {
      if (seen.has(sku))
        errors.push({ row, field: 'sku', message: 'This SKU is in the file twice.' });
      seen.add(sku);
    }
    if (sku && knownSkus.includes(sku)) existing += 1;
    else if (!v.name || !v.category || !v.condition)
      errors.push({
        row,
        field: v.name ? (v.category ? 'condition' : 'category') : 'name',
        message: 'A new item needs name, category and condition.',
      });
    else created += 1;
  });
  return {
    rows: Math.max(lines.length - 1, 0),
    items_created: created,
    items_existing: existing,
    opening_quantity_total: total,
    errors,
  };
}
