import type { components } from '../api/schema';

type S = components['schemas'];

// Mock data only: shapes come from the contract schemas, values are made up for demos.
export const t = '2026-11-23T14:05:00Z';

export const warehouse: S['Branch'] = {
  id: 1,
  kind: 'warehouse',
  branch_type: 'warehouse',
  code: 'WH',
  name: 'Central Warehouse',
  is_active: true,
  created_at: t,
  updated_at: t,
};
export const branchA: S['Branch'] = {
  id: 2,
  kind: 'branch',
  branch_type: 'branch',
  code: 'ACC',
  name: 'Accra Branch',
  is_active: true,
  created_at: t,
  updated_at: t,
};
export const branchB: S['Branch'] = {
  id: 3,
  kind: 'branch',
  branch_type: 'branch',
  code: 'KUM',
  name: 'Kumasi Branch',
  is_active: true,
  created_at: t,
  updated_at: t,
};
export const branches = [warehouse, branchA, branchB];
export const byBranch = (id: string | null) => branches.find((b) => String(b.id) === id);

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
    entry('sales', 'Sales', '/sell/sales'),
  ],
} satisfies Record<string, S['Me']['menu']>;

/** Home tiles as /me gives them in contract 0.5.2: the screens the full menus cannot hold. */
const homeLinks = {
  super_admin: [
    entry('activity', 'Activity', '/activity'),
    entry('shortfalls', 'Shortfalls', '/shortfalls'),
    entry('sell', 'Sell', '/sell'),
    entry('find', 'Find', '/find'),
    entry('receive', 'Receive', '/receive'),
    entry('sales', 'Sales', '/sell/sales'),
  ],
  warehouse_admin: [
    entry('activity', 'Activity', '/activity'),
    entry('shortfalls', 'Shortfalls', '/shortfalls'),
  ],
  branch_admin: [
    entry('activity', 'Activity', '/activity'),
    entry('shortfalls', 'Shortfalls', '/shortfalls'),
    entry('sales', 'Sales', '/sell/sales'),
  ],
  front_staff: [],
} satisfies Record<string, S['Me']['home_links']>;

export const me: S['Me'] = {
  user: users[0],
  active_role: 'super_admin',
  // The Super Admin works across all branches and is never asked to pick one.
  working_branch: null,
  must_pick_branch: false,
  all_branches: true,
  can_assign_multiple_roles: true,
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
    'sales.record',
    'sales.cancel',
    'items.import',
    'activity.view',
    'shortfalls.resolve',
    'find.use',
    'dashboard.view',
  ],
  menu: menus.super_admin,
  home_links: homeLinks.super_admin,
};

/** Mock sessions by role. Menus follow the FE requirements table; Branch Admin and Front Staff get no cost permission. */
export type MockRole = 'super_admin' | 'warehouse_admin' | 'branch_admin' | 'front_staff';
export const meByRole: Record<MockRole, S['Me']> = {
  super_admin: me,
  warehouse_admin: {
    must_change_password: false,
    menu: menus.warehouse_admin,
    home_links: homeLinks.warehouse_admin,
    must_pick_branch: false,
    all_branches: false,
    can_assign_multiple_roles: false,
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
      'items.import',
      'dispatches.create',
      'dispatches.view',
      'activity.view',
      'shortfalls.resolve',
      'find.use',
      'dashboard.view',
    ],
  },
  branch_admin: {
    must_change_password: false,
    menu: menus.branch_admin,
    home_links: homeLinks.branch_admin,
    must_pick_branch: false,
    all_branches: false,
    can_assign_multiple_roles: false,
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
      'sales.record',
      'sales.cancel',
      'activity.view',
      'shortfalls.resolve',
      'find.use',
      'dashboard.view',
    ],
  },
  front_staff: {
    must_change_password: false,
    menu: menus.front_staff,
    home_links: homeLinks.front_staff,
    must_pick_branch: false,
    all_branches: false,
    can_assign_multiple_roles: false,
    user: users[2],
    active_role: 'front_staff',
    working_branch: branchA,
    permissions: [
      'working_branch.select',
      'items.view',
      'stock.view',
      'dispatches.waiting',
      'dispatches.receive',
      'sales.record',
      'find.use',
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
  // The mock handler fills these from the stores, scoped to the caller.
  low_stock_count: 0,
  low_stock: [],
  recent_activity: [],
};

const ev = (
  id: number,
  hour: string,
  user: { id: number; login_id: string; roles: string[] },
  branch: S['Branch'] | null,
  action: string,
  target_type: string,
  target_ref: string,
): S['ActivityEvent'] => ({
  id,
  occurred_at: `2026-11-2${id < 4 ? 3 : 4}T${hour}:00Z`,
  user_id: user.id,
  user_login_id: user.login_id,
  user_role: user.roles[0],
  branch_id: branch?.id ?? null,
  branch_name: branch?.name ?? null,
  action,
  target_type,
  target_ref,
  is_self_approval: false,
});
/** Audit events, oldest first (the API lists newest first). Metadata only, no before/after values, no cost. */
export const activityEvents: S['ActivityEvent'][] = [
  ev(1, '08:10', users[3], warehouse, 'goods_receipt_created', 'goods_receipt', 'GRN-000001'),
  ev(2, '09:20', users[3], warehouse, 'dispatch_created', 'dispatch', 'TRF-000001'),
  ev(3, '10:30', users[3], warehouse, 'dispatch_created', 'dispatch', 'TRF-000002'),
  ev(4, '11:45', users[1], branchA, 'dispatch_received', 'dispatch', 'TRF-000003'),
  ev(5, '13:00', users[2], branchA, 'sale_recorded', 'sale', 'SAL-000001'),
  ev(6, '14:05', users[0], null, 'user_created', 'user', 'USR-0004'),
];

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
const common: S['ItemFieldDefinition'][] = [
  { key: 'name', label: 'Name', type: 'text', required: true, group: null, in_key_specs: false },
  {
    key: 'grade',
    label: 'Grade',
    type: 'choice',
    required: false,
    choices: ['A', 'B', 'C'],
    group: null,
    in_key_specs: false,
  },
  {
    key: 'description',
    label: 'Description',
    type: 'text',
    required: false,
    group: null,
    in_key_specs: false,
  },
];
export const fieldDefinitions: S['ItemFieldDefinition'][] = [
  ...common,
  {
    key: 'ram_gb',
    label: 'RAM (GB)',
    type: 'integer',
    required: true,
    group: 'Memory',
    in_key_specs: true,
  },
  {
    key: 'storage_type',
    label: 'Storage type',
    type: 'choice',
    required: false,
    choices: ['SSD', 'HDD'],
    group: 'Storage',
    in_key_specs: true,
  },
  {
    key: 'screen_in',
    label: 'Screen size (inches)',
    type: 'decimal',
    required: false,
    group: 'Display',
    in_key_specs: true,
  },
  {
    key: 'touchscreen',
    label: 'Touchscreen',
    type: 'boolean',
    required: false,
    group: 'Display',
    in_key_specs: true,
  },
];
/** Category-driven: the Accessory category has its own, shorter list. */
export const fieldDefinitionsFor = (categoryId: number): S['ItemFieldDefinition'][] =>
  categoryId === 3
    ? [
        ...common,
        {
          key: 'wattage',
          label: 'Wattage (W)',
          type: 'integer',
          required: true,
          group: null,
          in_key_specs: true,
        },
      ]
    : fieldDefinitions;

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
    reorder_level: 5,
    low_stock: false,
  },
  {
    location_id: branchA.id,
    location_name: branchA.name,
    item_id: 1,
    sku: 'SKU-000001',
    item_name: 'HP 250 G9',
    on_hand: 3,
    reserved: 0,
    available: 3,
    quarantined: 1,
    reorder_level: 5,
    low_stock: true,
  },
  {
    location_id: branchB.id,
    location_name: branchB.name,
    item_id: 1,
    sku: 'SKU-000001',
    item_name: 'HP 250 G9',
    on_hand: 2,
    reserved: 2,
    available: 0,
    quarantined: 0,
    reorder_level: null,
    low_stock: false,
  },
];

export const stockMovements: S['StockMovement'][] = [
  {
    id: 1,
    created_at: t,
    location_id: warehouse.id,
    location_name: warehouse.name,
    item_id: 1,
    sku: 'SKU-000001',
    item_name: 'HP 250 G9',
    bucket: 'on_hand',
    quantity_delta: 12,
    balance_after: 12,
    movement_type: 'supplier_receipt',
    source_type: 'goods_receipt',
    source_ref: 'GRN-000001',
    actor_login_id: 'USR-0001',
    note: '',
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
    {
      id: 2,
      item_id: 2,
      sku: 'SKU-000002',
      item_name: 'Dell 65W charger',
      qty_sent: 5,
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

/** A second delivery, waiting at Kumasi. */
const dispatchKumasi: S['Dispatch'] = {
  ...dispatch,
  id: 2,
  reference: 'TRF-000002',
  destination: branchB,
  lines: [{ ...dispatch.lines[0], id: 3, qty_sent: 3 }],
};

/** A delivery already received short: 5 sent, 3 accepted, the rest an open shortfall. */
const dispatchShort: S['Dispatch'] = {
  ...dispatch,
  id: 3,
  reference: 'TRF-000003',
  status: 'partially_received',
  lines: [
    {
      ...dispatch.lines[0],
      id: 4,
      qty_sent: 5,
      qty_received: 3,
      qty_accepted: 3,
      qty_rejected: 0,
      shortfall: 2,
    },
  ],
  received_at: t,
  received_by: 'USR-0002',
  receive_note: 'Two boxes did not arrive.',
  has_open_discrepancy: true,
};

export const dispatches: S['Dispatch'][] = [dispatch, dispatchKumasi, dispatchShort];

/** Sales at Accra: one completed, one cancelled. No cost anywhere (the contract's Sale never carries it). */
export const sales: S['Sale'][] = [
  {
    id: 1,
    reference: 'SAL-000001',
    location: branchA,
    staff: 'USR-0003',
    status: 'completed',
    payment_method: 'cash',
    total: '1250.00',
    sold_at: t,
    lines: [
      {
        id: 101,
        item_id: 1,
        sku: 'SKU-000001',
        item_name: 'HP 250 G9',
        quantity: 1,
        unit_price: '1250.00',
        line_total: '1250.00',
      },
    ],
    cancellation: null,
  },
  {
    id: 2,
    reference: 'SAL-000002',
    location: branchA,
    staff: 'USR-0003',
    status: 'cancelled',
    payment_method: 'card',
    total: '2500.00',
    sold_at: t,
    lines: [
      {
        id: 201,
        item_id: 1,
        sku: 'SKU-000001',
        item_name: 'HP 250 G9',
        quantity: 2,
        unit_price: '1250.00',
        line_total: '2500.00',
      },
    ],
    cancellation: {
      reason: 'Customer changed their mind',
      cancelled_by: 'USR-0002',
      cancelled_role: 'branch_admin',
      cancelled_at: t,
    },
  },
];
