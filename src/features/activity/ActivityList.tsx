import type { components } from '../../api';
import { StatusBadge } from '../../components/StatusBadge';
import { formatAccra } from '../../lib/time';

type Event = components['schemas']['ActivityEvent'];

/** "dispatch_created" to "Dispatch created". The action list is open-ended, so unknown codes still read. */
export const humanise = (code: string) => {
  const words = code.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Metadata only (who, what, where, when): the API sends no before/after values and no cost. */
export function ActivityList({ events }: { events: Event[] }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {events.map((e) => (
        <li key={e.id} className="flex flex-col gap-1 rounded-lg border border-line bg-white p-3">
          <p className="m-0 font-semibold">
            {humanise(e.action)} <span className="break-all font-normal">{e.target_ref}</span>
          </p>
          <p className="m-0 text-sm text-muted">
            {e.user_login_id} ({humanise(e.user_role)}) · {e.branch_name ?? 'No branch'} ·{' '}
            {formatAccra(e.occurred_at)}
          </p>
          {e.is_self_approval && (
            <span className="self-start">
              <StatusBadge status="low" label="Self-approved" />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
