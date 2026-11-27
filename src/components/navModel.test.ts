import { describe, expect, it } from 'vitest';
import { me as saMe } from '../mocks/data';
import { AUDIT_LOGS_PATH, navGroups } from './navModel';

const entry = (key: string, label: string, path: string) => ({ key, label, path });

describe('navGroups', () => {
  it('maps the server activity entry to a top-level Audit Logs item under Configure', () => {
    const groups = navGroups(saMe);
    const configure = groups.find((g) => g.label === 'Configure');
    expect(configure?.items).toEqual([
      expect.objectContaining({ to: AUDIT_LOGS_PATH, label: 'Audit Logs' }),
    ]);
    expect(groups.flatMap((g) => g.items).some((i) => i.to === '/activity')).toBe(false);
  });
  it('lists the menu first, then home links the menu does not repeat', () => {
    const groups = navGroups({
      menu: [entry('home', 'Home', '/'), entry('sell', 'Sell', '/sell')],
      home_links: [entry('sell', 'Sell', '/sell'), entry('find', 'Find', '/find')],
    });
    expect(groups.map((g) => g.label)).toEqual(['Menu', 'More']);
    expect(groups[1].items.map((i) => i.to)).toEqual(['/find']);
  });
  it('shows no Audit Logs and no empty group when the server offers no activity entry (Front Staff)', () => {
    const groups = navGroups({ menu: [entry('sell', 'Sell', '/sell')], home_links: [] });
    expect(groups.map((g) => g.label)).toEqual(['Menu']);
  });
  it('finds the activity entry in the menu as well as in the home links', () => {
    const groups = navGroups({
      menu: [entry('activity', 'Activity', '/activity')],
      home_links: [],
    });
    expect(groups.flatMap((g) => g.items).map((i) => i.label)).toEqual(['Audit Logs']);
  });
});
