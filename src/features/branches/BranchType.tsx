import { Store, Warehouse } from 'components/icons';
import type { components } from '../../api';
import { StatusBadge } from '../../components/ui';
import type { SegmentOption } from '../../components/ui';

type BranchType = components['schemas']['Branch']['branch_type'];

export const BRANCH_TYPE_LABEL: Record<BranchType, string> = {
  branch: 'Normal Branch',
  warehouse: 'Warehouse',
};

/** The two choices of the Branch Type selector. Which choices the server accepts is its decision (400 on branch_type). */
export const BRANCH_TYPE_OPTIONS: SegmentOption<BranchType>[] = [
  {
    value: 'branch',
    label: BRANCH_TYPE_LABEL.branch,
    icon: Store,
    description: 'A shop that sells and receives stock.',
  },
  {
    value: 'warehouse',
    label: BRANCH_TYPE_LABEL.warehouse,
    icon: Warehouse,
    description: 'The central store that holds and dispatches stock.',
  },
];

/** Type as text plus icon, never colour alone. */
export function BranchTypeBadge({ type }: { type: BranchType }) {
  return (
    <StatusBadge
      tone={type === 'warehouse' ? 'info' : 'neutral'}
      icon={type === 'warehouse' ? Warehouse : Store}
      variant="outline"
    >
      {BRANCH_TYPE_LABEL[type]}
    </StatusBadge>
  );
}
