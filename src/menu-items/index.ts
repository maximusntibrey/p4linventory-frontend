import type { ComponentType } from 'react';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import AuditOutlined from '@ant-design/icons/AuditOutlined';
import CarOutlined from '@ant-design/icons/CarOutlined';
import DashboardOutlined from '@ant-design/icons/DashboardOutlined';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import FileDoneOutlined from '@ant-design/icons/FileDoneOutlined';
import InboxOutlined from '@ant-design/icons/InboxOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import ShopOutlined from '@ant-design/icons/ShopOutlined';
import ShoppingCartOutlined from '@ant-design/icons/ShoppingCartOutlined';
import TagsOutlined from '@ant-design/icons/TagsOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import { navGroups } from '../components/navModel';
import type { Me } from '../auth/session';

// Looks only: which icon goes with a menu key. Which entries exist comes from the server (/me).
const byKey: Record<string, ComponentType> = {
  home: DashboardOutlined,
  items: TagsOutlined,
  warehouse: DatabaseOutlined,
  stock: DatabaseOutlined,
  branches: ShopOutlined,
  users: TeamOutlined,
  sell: ShoppingCartOutlined,
  sales: FileDoneOutlined,
  find: SearchOutlined,
  receive: InboxOutlined,
  receive_stock: InboxOutlined,
  dispatch: CarOutlined,
  activity: AuditOutlined,
  shortfalls: WarningOutlined,
};

export type MenuItem = {
  id: string;
  title: string;
  type: 'item';
  url: string;
  icon: ComponentType;
  breadcrumbs: boolean;
};
export type MenuGroup = { id: string; title: string; type: 'group'; children: MenuItem[] };

/**
 * The Mantis menu structure ({ items: [group] }) read by the drawer and the breadcrumbs.
 * shortcut: one shared mutable object (the template imports it as a module); set once per render of the layout.
 */
const menuItem: { items: MenuGroup[] } = { items: [] };

export function buildMenu(me: Pick<Me, 'menu' | 'home_links'>): MenuGroup[] {
  const groups: MenuGroup[] = navGroups(me).map((g) => ({
    id: `group-${g.label.toLowerCase()}`,
    title: g.label,
    type: 'group',
    children: g.items.map((i) => ({
      id: i.key,
      title: i.label,
      type: 'item',
      url: i.to,
      icon: byKey[i.key] ?? AppstoreOutlined,
      breadcrumbs: false, // legacy screens carry their own page title; enabled per screen when migrated
    })),
  }));
  // Every signed-in user has a Home (it shows only what their permissions allow), even when the server menu omits it.
  const hasHome = groups.some((g) => g.children.some((c) => c.url === '/'));
  if (!hasHome && groups.length)
    groups[0].children.unshift({
      id: 'home',
      title: 'Home',
      type: 'item',
      url: '/',
      icon: byKey.home,
      breadcrumbs: false,
    });
  return groups;
}

export function setMenu(items: MenuGroup[]) {
  menuItem.items = items;
}

export default menuItem;
