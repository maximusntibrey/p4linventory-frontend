import type { components } from '../../api';

type S = components['schemas'];

// Words only. Which moves are allowed, and what an item needs to be active, is the server's call.
export const itemStatusBadge = {
  draft: { status: 'pending', label: 'Draft' },
  active: { status: 'active', label: 'Active' },
  discontinued: { status: 'deactivated', label: 'Discontinued' },
} as const satisfies Record<S['ItemStatus'], { status: string; label: string }>;

export const itemStatuses = Object.keys(itemStatusBadge) as S['ItemStatus'][];

export const conditionLabels: Record<S['Item']['condition'], string> = {
  new: 'New',
  refurbished: 'Refurbished',
  used: 'Used',
};
export const conditionCodes = Object.keys(conditionLabels) as S['Item']['condition'][];

/** Money arrives as a decimal string with two places; this only adds the currency word. */
export const ghs = (m: string) => `GHS ${m}`;

/** The average cost if the API sent one (SA and WA only); undefined when the field is not there at all. */
export const averageCost = (item: S['Item']): string | null | undefined =>
  'average_cost' in item ? (item as S['ItemWithCost']).average_cost : undefined;

/** The row without its cost, for users who may not see cost even if a response carried it. */
export const withoutCost = <T extends object>(row: T): T =>
  Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'average_cost')) as T;

export const costText = (cost: string | null) => (cost ? ghs(cost) : 'none yet (no receipt)');
