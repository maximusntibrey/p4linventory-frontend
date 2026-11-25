import type { components } from '../../api';

type R = components['schemas']['ShortfallResolve']['resolution'];

export const resolutionCodes: R[] = ['return_to_sender', 'confirm_loss', 'record_damage'];
export const resolutionLabels: Record<R, string> = {
  return_to_sender: 'Return to sender',
  confirm_loss: 'Confirm loss',
  record_damage: 'Record damage',
};
/** What the server does (contract 0.5.0), so the confirm step says it before the user commits. */
export const resolutionEffects: Record<R, string> = {
  return_to_sender: 'The sender keeps the items: their reserved stock is released.',
  confirm_loss: 'The items are written off at the sender: reserved and on hand both go down.',
  record_damage:
    'The items are written off at the sender and held as quarantined stock at the destination.',
};
