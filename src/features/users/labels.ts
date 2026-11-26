import type { components } from '../../api';

type S = components['schemas'];

// Words only. Which roles and permissions exist, and who may hold them, is the server's call.
export const roleLabels: Record<S['RoleCode'], string> = {
  super_admin: 'Super Admin',
  warehouse_admin: 'Warehouse Admin',
  branch_admin: 'Branch Admin',
  front_staff: 'Front Staff',
};
export const roleCodes = Object.keys(roleLabels) as S['RoleCode'][];

export const permissionLabels: Record<S['PersonPermission'], string> = {
  receive_stock: 'Receive stock',
  manage_prices: 'Manage prices',
  discount: 'Discount',
};
export const permissionCodes = Object.keys(permissionLabels) as S['PersonPermission'][];

/** Account status code to the StatusBadge key. */
export const statusBadge = {
  active: 'active',
  pending_activation: 'pending',
  suspended: 'suspended',
  deactivated: 'deactivated',
} as const satisfies Record<S['UserStatus'], string>;
