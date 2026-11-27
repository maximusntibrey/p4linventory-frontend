import type { SidebarSection } from './ui';
import type { Me } from '../auth/session';
import { iconForMenuKey } from './menuIcons';

/** Where the audit log lives. The server's `activity` entry (menu or home link) opens this screen. */
export const AUDIT_LOGS_PATH = '/audit-logs';
const AUDIT_KEY = 'activity';

type Entry = Me['menu'][number];

/** A server menu or home link as the app shows it: the `activity` entry becomes Audit Logs. */
export const resolveEntry = (e: Entry): Entry =>
  e.key === AUDIT_KEY ? { ...e, label: 'Audit Logs', path: AUDIT_LOGS_PATH } : e;

const item = (e: Entry) => ({ to: e.path, label: e.label, icon: iconForMenuKey(e.key) });

/**
 * Sidebar groups built only from what /me returns, so a screen the server does not list is never shown.
 * Menu = the server's menu; More = home links it does not repeat; Configure = Audit Logs, when the server
 * offers the `activity` entry (the entry is the permission signal, the route guard still checks `activity.view`).
 */
export function navSections(me: Pick<Me, 'menu' | 'home_links'>): SidebarSection[] {
  const hasAudit = [...me.menu, ...me.home_links].some((e) => e.key === AUDIT_KEY);
  const menuPaths = new Set(me.menu.map((e) => e.path));
  const menu = me.menu.filter((e) => e.key !== AUDIT_KEY).map(item);
  const more = me.home_links.filter((e) => e.key !== AUDIT_KEY && !menuPaths.has(e.path)).map(item);
  return [
    { label: 'Menu', items: menu },
    { label: 'More', items: more },
    {
      label: 'Configure',
      items: hasAudit
        ? [{ to: AUDIT_LOGS_PATH, label: 'Audit Logs', icon: iconForMenuKey(AUDIT_KEY) }]
        : [],
    },
  ].filter((s) => s.items.length > 0);
}
