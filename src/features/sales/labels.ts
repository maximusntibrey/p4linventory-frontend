import type { components } from '../../api';

type S = components['schemas'];

/** Payment method codes (contract 0.4.0, owner 2026-11-24) to words. */
export const paymentLabels: Record<S['PaymentMethodCode'], string> = {
  cash: 'Cash',
  mobile_money: 'Mobile money',
  card: 'Card',
};
export const paymentCodes = Object.keys(paymentLabels) as S['PaymentMethodCode'][];
export const paymentLabel = (code: string) =>
  (paymentLabels as Record<string, string>)[code] ?? code;

/** Only completed and cancelled are reachable in the MVP; other codes show as plain words. */
export const saleStatusLabels: Record<S['SaleStatus'], string> = {
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  exchanged: 'Exchanged',
};

/** "1250.00" to 125000, from the digits (never a float). Only for the running total shown before the server prices the sale. */
export const toCents = (m: string) => {
  const [whole, frac = ''] = m.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0').slice(0, 2));
};
export const fromCents = (c: number) =>
  `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

/** Link that looks like a button (min 44 px). */
export const linkButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-control bg-white px-4 font-semibold text-ink no-underline hover:bg-surface';
