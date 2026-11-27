import { describe, expect, it } from 'vitest';
import { buildPalette } from './palette';

// Numeric WCAG 2.x contrast of every text/background pair the brand theme uses (recorded in docs/DESIGN-SYSTEM.md).
const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

type Palette = Record<string, Record<string, string>>;
const p = buildPalette().light as unknown as Palette & {
  text: Record<string, string>;
  background: Record<string, string>;
};
const WHITE = p.common.white;

// [label, foreground, background, minimum]. 4.5 = normal text, 3 = large text, icons and graphics.
const pairs: [string, string, string, number][] = [
  ['body text on cards', p.text.primary, p.background.paper, 4.5],
  ['body text on page background', p.text.primary, p.background.default, 4.5],
  ['secondary text on cards', p.text.secondary, p.background.paper, 4.5],
  ['secondary text on page background', p.text.secondary, p.background.default, 4.5],
  ['white on primary button (filled orange)', WHITE, p.primary.main, 4.5],
  ['white on primary button hover', WHITE, p.primary.dark, 4.5],
  ['primary text/link on white', p.primary.main, p.background.paper, 4.5],
  ['primary text on soft orange tint (chip, selected row)', p.primary.main, p.primary.lighter, 4.5],
  ['body text on selected row tint', p.text.primary, p.primary.lighter, 4.5],
  [
    'accent orange on white (decorative graphics only; never text or focus ring)',
    p.primary[400],
    p.background.paper,
    2.8,
  ],
  ['drawer text on navy', p.navy.lighter, p.navy.main, 4.5],
  ['drawer muted group label on navy', p.navy.light, p.navy.main, 4.5],
  ['drawer text on hover row (darker navy)', p.navy.lighter, p.navy.dark, 4.5],
  ['drawer active text (white) on lighter navy', WHITE, p.navy[400], 4.5],
  ['drawer active icon/accent bar (orange) on lighter navy', p.primary[400], p.navy[400], 3],
  ['drawer accent orange on navy', p.primary[400], p.navy.main, 3],
  ['table header text (navy) on light navy tint', p.navy.main, p.navy.lighter, 4.5],
  ['body text on table header tint', p.text.primary, p.navy.lighter, 4.5],
  ...(['error', 'warning', 'success', 'info'] as const).flatMap(
    (s): [string, string, string, number][] => [
      [`${s}: white on filled ${s}`, WHITE, p[s].main, 4.5],
      [`${s}: soft chip text on tint`, p[s].main, p[s].lighter, 4.5],
      [`${s}: dark text on tint`, p[s].dark, p[s].lighter, 4.5],
    ],
  ),
];

describe('brand palette contrast (WCAG AA)', () => {
  it.each(pairs)('%s', (_label, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('never uses the orange accent for status colours', () => {
    for (const s of ['error', 'warning', 'success', 'info']) {
      expect(p[s].main.toLowerCase()).not.toBe(p.primary[400].toLowerCase());
      expect(p[s].main.toLowerCase()).not.toBe(p.primary.main.toLowerCase());
    }
  });
});

export { pairs };
