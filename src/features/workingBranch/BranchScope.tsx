import { useCurrentMe } from '../../auth/guards';
import { BranchFilter } from './BranchFilter';

/** The Super Admin's "filter by branch" lives inside the pages whose API accepts `branch` (dashboard, users, sales), never in the header. */
export function BranchScope() {
  return useCurrentMe().all_branches ? <BranchFilter /> : null;
}
