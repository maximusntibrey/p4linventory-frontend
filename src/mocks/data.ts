import type { components } from '../api/schema';

type S = components['schemas'];

// Mock data only: shapes come from the contract schemas, values are made up for demos.
export const t = '2026-11-23T14:05:00Z';

export const warehouse: S['Branch'] = {
  id: 1,
  kind: 'warehouse',
  code: 'WH',
  name: 'Central Warehouse',
  is_active: true,
  created_at: t,
  updated_at: t,
};
export const branchA: S['Branch'] = {
  id: 2,
  kind: 'branch',
  code: 'ACC',
  name: 'Accra Branch',
  is_active: true,
  created_at: t,
  updated_at: t,
};
export const branchB: S['Branch'] = {
  id: 3,
  kind: 'branch',
  code: 'KUM',
  name: 'Kumasi Branch',
  is_active: true,
  created_at: t,
  updated_at: t,
};
export const branches = [warehouse, branchA, branchB];

export const users: S['User'][] = [
  {
    id: 1,
    login_id: 'SA-0001',
    full_name: 'Ama Mensah',
    status: 'active',
    roles: ['super_admin'],
    permanent_location_id: null,
    must_change_password: false,
    permissions: [],
    last_login_at: t,
    created_at: t,
  },
  {
    id: 2,
    login_id: 'USR-0001',
    full_name: 'Kofi Boateng',
    status: 'active',
    roles: ['branch_admin'],
    permanent_location_id: branchA.id,
    must_change_password: false,
    permissions: ['receive_stock'],
    last_login_at: null,
    created_at: t,
  },
  {
    id: 3,
    login_id: 'USR-0002',
    full_name: 'Esi Owusu',
    status: 'active',
    roles: ['front_staff'],
    permanent_location_id: null,
    must_change_password: false,
    permissions: [],
    last_login_at: null,
    created_at: t,
  },
  {
    id: 4,
    login_id: 'USR-0003',
    full_name: 'Yaw Asante',
    status: 'active',
    roles: ['warehouse_admin'],
    permanent_location_id: warehouse.id,
    must_change_password: false,
    permissions: [],
    last_login_at: null,
    created_at: t,
  },
  // Mock login for the forced password change: any password except "wrong" or "locked" works.
  {
    id: 5,
    login_id: 'USR-0004',
    full_name: 'Efua Quaye',
    status: 'pending_activation',
    roles: ['front_staff'],
    permanent_location_id: null,
    must_change_password: true,
    permissions: [],
    last_login_at: null,
    created_at: t,
  },
];

const entry = (key: string, label: string, path: string) => ({ key, label, path });
const menus = {
  super_admin: [
    entry('home', 'Home', '/'),
    entry('items', 'Items', '/items'),
    entry('warehouse', 'Warehouse', '/warehouse'),
    entry('branches', 'Branches', '/branches'),
    entry('users', 'Users', '/users'),
  ],
  warehouse_admin: [
    entry('home', 'Home', '/'),
    entry('items', 'Items', '/items'),
    entry('receive_stock', 'Receive stock', '/goods-receipts'),
    entry('dispatch', 'Dispatch', '/dispatches'),
    entry('find', 'Find', '/find'),
  ],
  branch_admin: [
    entry('home', 'Home', '/'),
    entry('sell', 'Sell', '/sell'),
    entry('find', 'Find', '/find'),
    entry('stock', 'Stock', '/stock'),
    entry('receive', 'Receive', '/receive'),
  ],
  front_staff: [
    entry('sell', 'Sell', '/sell'),
    entry('find', 'Find', '/find'),
    entry('stock', 'Stock', '/stock'),
    entry('receive', 'Receive', '/receive'),
  ],
} satisfies Record<string, S['Me']['menu']>;

export const me: S['Me'] = {
  user: users[0],
  active_role: 'super_admin',
  working_branch: branchA,
  must_change_password: false,
  permissions: [
    'users.manage',
    'users.view',
    'branches.manage',
    'branches.view',
    'working_branch.select',
    'items.view',
    'items.manage',
    'items.view_cost',
    'prices.manage',
    'stock.view',
    'stock.lookup_other_branches',
    'goods_receipts.manage',
    'dispatches.create',
    'dispatches.view',
    'dispatches.waiting',
    'dispatches.receive',
  ],
  menu: menus.super_admin,
};

/** Mock sessions by role. Menus follow the FE requirements table; Branch Admin and Front Staff get no cost permission. */
export type MockRole = 'super_admin' | 'warehouse_admin' | 'branch_admin' | 'front_staff';
export const meByRole: Record<MockRole, S['Me']> = {
  super_admin: me,
  warehouse_admin: {
    must_change_password: false,
    menu: menus.warehouse_admin,
    user: users[3],
    active_role: 'warehouse_admin',
    working_branch: warehouse,
    permissions: [
      'branches.view',
      'items.view',
      'items.manage',
      'items.view_cost',
      'prices.manage',
      'stock.view',
      'stock.lookup_other_branches',
      'goods_receipts.manage',
      'dispatches.create',
      'dispatches.view',
    ],
  },
  branch_admin: {
    must_change_password: false,
    menu: menus.branch_admin,
    user: users[1],
    active_role: 'branch_admin',
    working_branch: branchA,
    permissions: [
      'branches.view',
      'items.view',
      'stock.view',
      'dispatches.view',
      'dispatches.waiting',
      'dispatches.receive',
    ],
  },
  front_staff: {
    must_change_password: false,
    menu: menus.front_staff,
    user: users[2],
    active_role: 'front_staff',
    working_branch: branchA,
    permissions: [
      'working_branch.select',
      'items.view',
      'stock.view',
      'dispatches.waiting',
      'dispatches.receive',
    ],
  },
};
export const roleOfLogin = (loginId: unknown): MockRole => {
  const role = users.find((u) => u.login_id === loginId)?.roles[0];
  return role ?? 'super_admin';
};

export const dashboard: S['Dashboard'] = {
  role: 'super_admin',
  location: branchA,
  waiting_dispatches: 1,
  in_transit_dispatches: 1,
  active_items: 1,
  stock_per_location: [
    { location_id: 1, location_name: warehouse.name, on_hand: 12, available: 10 },
    { location_id: 2, location_name: branchA.name, on_hand: 3, available: 3 },
  ],
};

export const categories: S['ItemCategory'][] = [
  { id: 1, name: 'Laptop', subtypes: [{ id: 1, name: 'Business laptop' }] },
  { id: 2, name: 'Laptop Part', subtypes: [{ id: 2, name: 'Battery' }] },
  { id: 3, name: 'Accessory', subtypes: [{ id: 3, name: 'Charger' }] },
];
export const brands: S['Brand'][] = [
  { id: 1, name: 'HP', is_active: true },
  { id: 2, name: 'Dell', is_active: true },
  { id: 3, name: 'Acer', is_active: false },
];
export const fieldDefinitions: S['ItemFieldDefinition'][] = [
  {
    key: 'ram_gb',
    label: 'RAM (GB)',
    type: 'integer',
    required: true,
    group: 'Memory',
    in_key_specs: true,
  },
  { key: 'name', label: 'Name', type: 'text', required: true, group: null, in_key_specs: false },
];

export const items: S['Item'][] = [
  {
    id: 1,
    sku: 'SKU-000001',
    name: 'HP 250 G9',
    category_id: 1,
    subtype_id: 1,
    brand_id: 1,
    brand_name: 'HP',
    model_name: '250 G9',
    mpn: '6S6D3EA',
    condition: 'refurbished',
    grade: 'A',
    unit_of_measure: 'piece',
    status: 'active',
    key_specs: { ram_gb: 8 },
    image_url: null,
    show_on_website: true,
    selling_price: '1250.00',
    created_at: t,
    updated_at: t,
  },
  {
    id: 2,
    sku: 'SKU-000002',
    name: 'Dell 65W charger',
    category_id: 3,
    subtype_id: 3,
    brand_id: 2,
    brand_name: 'Dell',
    model_name: 'LA65NM',
    mpn: 'LA65NM190',
    condition: 'new',
    grade: null,
    unit_of_measure: 'piece',
    status: 'draft',
    key_specs: {},
    image_url: null,
    show_on_website: false,
    selling_price: null,
    created_at: t,
    updated_at: t,
  },
];

export const stock: S['StockBalance'][] = [
  {
    location_id: warehouse.id,
    location_name: warehouse.name,
    item_id: 1,
    sku: 'SKU-000001',
    item_name: 'HP 250 G9',
    on_hand: 12,
    reserved: 2,
    available: 10,
    quarantined: 0,
  },
];

/** Cost variants, served only by the costed endpoints (SA/WA). Item 2 has had no receipt yet, so its cost is null. */
export const costedItems: S['ItemWithCost'][] = [
  { ...items[0], average_cost: '900.00' },
  { ...items[1], average_cost: null },
];
export const costedStock: S['StockBalanceWithCost'][] = stock.map((row) => ({
  ...row,
  average_cost: '900.00',
}));

export const availability: S['BranchAvailability'][] = [
  { branch_id: branchA.id, branch_name: branchA.name, quantity: 3 },
  { branch_id: branchB.id, branch_name: branchB.name, quantity: 0 },
];

export const goodsReceipt: S['GoodsReceipt'] = {
  id: 1,
  reference: 'GRN-000001',
  location_id: warehouse.id,
  supplier_name: 'Sample Supplier Ltd',
  notes: '',
  lines: [
    {
      id: 1,
      item_id: 1,
      sku: 'SKU-000001',
      item_name: 'HP 250 G9',
      quantity: 12,
      unit_cost: '900.00',
    },
  ],
  received_at: t,
  received_by: 'USR-0001',
};

export const dispatch: S['Dispatch'] = {
  id: 1,
  reference: 'TRF-000001',
  origin: warehouse,
  destination: branchA,
  status: 'in_transit',
  lines: [
    {
      id: 1,
      item_id: 1,
      sku: 'SKU-000001',
      item_name: 'HP 250 G9',
      qty_sent: 2,
      qty_received: null,
      qty_accepted: null,
      qty_rejected: null,
      shortfall: 0,
      line_note: null,
    },
  ],
  dispatched_at: t,
  dispatched_by: 'USR-0001',
  received_at: null,
  received_by: null,
  receive_note: null,
  has_open_discrepancy: false,
};
