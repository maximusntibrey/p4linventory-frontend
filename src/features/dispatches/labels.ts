import type { components } from '../../api';

type S = components['schemas'];

// Words only (SKILLS "Transfer"). What each status allows next is the server's call.
export const dispatchStatusBadge = {
  in_transit: { status: 'in-transit', label: 'In transit' },
  completed: { status: 'completed', label: 'Completed' },
  partially_received: { status: 'partial', label: 'Partially received' },
  rejected: { status: 'rejected', label: 'Rejected' },
} as const satisfies Record<S['DispatchStatus'], { status: string; label: string }>;

export const dispatchStatuses = Object.keys(dispatchStatusBadge) as S['DispatchStatus'][];

/** Total units on a dispatch, for list cards. */
export const unitsSent = (d: S['Dispatch']) => d.lines.reduce((n, l) => n + l.qty_sent, 0);
