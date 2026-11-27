import type { Me } from '../auth/session';

/** Where the audit log lives. The server's `activity` entry (menu or home link) opens this screen. */
export const AUDIT_LOGS_PATH = '/audit-logs';
const AUDIT_KEY = 'activity';

type Entry = Me['menu'][number];

/** A server menu or home link as the app shows it: the `activity` entry becomes Audit Logs. */
export const resolveEntry = (e: Entry): Entry =>
  e.key === AUDIT_KEY ? { ...e, label: 'Audit Logs', path: AUDIT_LOGS_PATH } : e;

export type NavGroupModel = { label: string; items: { key: string; to: string; label: string }[] };

const raw = (e: Entry) => ({ key: e.key, to: e.path, label: e.label });

/**
 * Groups built only from what /me returns, so a screen the server does not list is never shown.
 * Menu = the server's menu; More = home links it does not repeat; Configure = Audit Logs, when the server
 * offers the `activity` entry (the entry is the permission signal, the route guard still checks `activity.view`).
 */
export function navGroups(me: Pick<Me, 'menu' | 'home_links'>): NavGroupModel[] {
  const hasAudit = [...me.menu, ...me.home_links].some((e) => e.key === AUDIT_KEY);
  const menuPaths = new Set(me.menu.map((e) => e.path));
  const menu = me.menu.filter((e) => e.key !== AUDIT_KEY).map(raw);
  const more = me.home_links.filter((e) => e.key !== AUDIT_KEY && !menuPaths.has(e.path)).map(raw);
  return [
    { label: 'Menu', items: menu },
    { label: 'More', items: more },
    {
      label: 'Configure',
      items: hasAudit ? [{ key: AUDIT_KEY, to: AUDIT_LOGS_PATH, label: 'Audit Logs' }] : [],
    },
  ].filter((s) => s.items.length > 0);
}
