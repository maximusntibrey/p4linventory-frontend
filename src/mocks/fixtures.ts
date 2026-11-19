// Contract-shaped example data for the mock API (F1.4). Every object is typed from the generated
// schema, so a contract change that breaks a fixture fails `npm run typecheck`. These are mock
// data only: they stand in for what the server decides and are never read by production code.
import type { components } from '../api/schema.gen.ts';

type Schemas = components['schemas'];

export const MOCK_PASSWORD = 'mock-password';
export const MOCK_REQUEST_ID = '0b2e5a8c-3f77-4c1f-9a43-7a2b6f1d9e10';

export const warehouse: Schemas['BranchRef'] = {
  id: 1,
  code: 'WH-001',
  name: 'Central Warehouse',
  kind: 'warehouse',
};
export const accra: Schemas['BranchRef'] = {
  id: 2,
  code: 'BR-001',
  name: 'Accra Branch',
  kind: 'branch',
};
export const kumasi: Schemas['BranchRef'] = {
  id: 3,
  code: 'BR-002',
  name: 'Kumasi Branch',
  kind: 'branch',
};

const branchActions: Schemas['ActionId'][] = ['branch.list'];

export const branches: Schemas['Branch'][] = [warehouse, accra, kumasi].map((ref) => ({
  ...ref,
  status: 'active' as const,
  location: `${ref.name} street`,
  contact: '0200000000',
  created_at: '2026-11-19T09:30:00Z',
  updated_at: '2026-11-19T09:30:00Z',
  allowed_actions: branchActions,
}));

// Mock users. Which one signs in is chosen by the login ID typed on the login form.
export interface MockAccount {
  me: Schemas['Me'];
  user: Schemas['User'];
}

function account(
  id: number,
  loginId: Schemas['UserRef']['login_id'],
  fullName: string,
  role: Schemas['RoleCode'],
  permanentBranch: Schemas['BranchRef'] | null,
  extra: {
    mustChangePassword?: boolean;
    allowed: Schemas['ActionId'][];
    menu: Schemas['MenuItem'][];
  },
): MockAccount {
  const user: Schemas['User'] = {
    id,
    login_id: loginId,
    full_name: fullName,
    phone: '0200000001',
    email: null,
    status: 'active',
    role,
    permanent_branch: permanentBranch,
    permissions: [],
    last_login: '2026-11-19T08:00:00Z',
    deactivated_at: null,
    created_at: '2026-11-01T08:00:00Z',
    allowed_actions: extra.allowed,
  };
  const me: Schemas['Me'] = {
    user: { id, login_id: loginId, full_name: fullName },
    phone: user.phone,
    email: user.email,
    role,
    must_change_password: extra.mustChangePassword ?? false,
    permanent_branch: permanentBranch,
    permissions: [],
    active_branch: permanentBranch,
    needs_branch_selection: permanentBranch === null,
    allowed_actions: extra.allowed,
    menu: extra.menu,
  };
  return { me, user };
}

export const accounts: Record<string, MockAccount> = {
  'SA-0001': account(1, 'SA-0001', 'Ama Mensah', 'super_admin', null, {
    allowed: [
      'auth.me',
      'auth.logout',
      'auth.change_password',
      'context.list_selectable',
      'context.select_branch',
      'context.switch_branch',
      'branch.list',
      'user.list',
      'dashboard.shell',
    ],
    menu: [
      { key: 'home', label: 'Home', required_actions: ['dashboard.shell'] },
      { key: 'branches', label: 'Branches', required_actions: ['branch.list'] },
      { key: 'users', label: 'Users', required_actions: ['user.list'] },
    ],
  }),
  'USR-0002': account(2, 'USR-0002', 'Kofi Boateng', 'front_staff', null, {
    allowed: [
      'auth.me',
      'auth.logout',
      'auth.change_password',
      'context.list_selectable',
      'context.select_branch',
      'context.switch_branch',
    ],
    menu: [],
  }),
  // Signs in but still has a one-time password: every endpoint but me, logout and
  // change-password answers 403 password_change_required.
  'USR-0009': account(9, 'USR-0009', 'Esi Owusu', 'branch_admin', accra, {
    mustChangePassword: true,
    allowed: ['auth.me', 'auth.logout', 'auth.change_password'],
    menu: [],
  }),
};

export const dashboardShell: Schemas['DashboardShell'] = {
  active_branch: accra,
  home_available: true,
  sections: [{ key: 'stats', label: 'Stock today', required_action: 'dashboard.shell' }],
  quick_actions: [],
};

export function page<T>(results: T[]): Schemas['PageEnvelope'] & { results: T[] } {
  return { count: results.length, next: null, previous: null, results };
}

export function errorBody(
  code: string,
  message: string,
  errors: Schemas['ErrorDetail'][] = [],
): Schemas['Error'] {
  return { code, message, errors, request_id: MOCK_REQUEST_ID };
}
