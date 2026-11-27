import { describe, expect, it } from 'vitest';
import { me as saMe } from '../mocks/data';
import { AUDIT_LOGS_PATH, navSections } from './navModel';

const entry = (key: string, label: string, path: string) => ({ key, label, path });

describe('navSections', () => {
  it('maps the server activity entry to a top-level Audit Logs item under Configure', () => {
    const sections = navSections(saMe);
    const configure = sections.find((s) => s.label === 'Configure');
    expect(configure?.items).toEqual([
      expect.objectContaining({ to: AUDIT_LOGS_PATH, label: 'Audit Logs' }),
    ]);
    expect(sections.flatMap((s) => s.items).some((i) => i.to === '/activity')).toBe(false);
  });
  it('lists the menu first, then home links the menu does not repeat', () => {
    const sections = navSections({
      menu: [entry('home', 'Home', '/'), entry('sell', 'Sell', '/sell')],
      home_links: [entry('sell', 'Sell', '/sell'), entry('find', 'Find', '/find')],
    });
    expect(sections.map((s) => s.label)).toEqual(['Menu', 'More']);
    expect(sections[1].items.map((i) => i.to)).toEqual(['/find']);
  });
  it('shows no Audit Logs and no empty group when the server offers no activity entry (Front Staff)', () => {
    const sections = navSections({ menu: [entry('sell', 'Sell', '/sell')], home_links: [] });
    expect(sections.map((s) => s.label)).toEqual(['Menu']);
  });
  it('finds the activity entry in the menu as well as in the home links', () => {
    const sections = navSections({
      menu: [entry('activity', 'Activity', '/activity')],
      home_links: [],
    });
    expect(sections.flatMap((s) => s.items).map((i) => i.label)).toEqual(['Audit Logs']);
  });
});
