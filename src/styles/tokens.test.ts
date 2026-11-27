import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/tokens.css', 'utf8');

/** Resolve `--name` to a #rrggbb value, following var() aliases. */
function colour(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`token --${name} not found`);
  const v = m[1].replace(/\/\*.*?\*\//g, '').trim();
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  return ref ? colour(ref[1]) : v;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(colour(fg)), luminance(colour(bg))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const text: [string, string][] = [
  ['color-ink', 'color-canvas'],
  ['color-ink', 'color-surface'],
  ['color-ink', 'color-primary-soft'],
  ['color-ink', 'color-primary-soft-strong'],
  ['color-muted', 'color-canvas'],
  ['color-muted', 'color-surface'],
  ['color-muted', 'color-primary-soft'],
  ['color-on-primary', 'color-primary-solid'],
  ['color-on-primary', 'color-primary-solid-hover'],
  ['color-primary-solid', 'color-canvas'],
  ['color-primary-solid', 'color-primary-soft'],
  ['color-primary-solid-hover', 'color-primary-soft-strong'],
  ['color-ok', 'color-ok-bg'],
  ['color-ok', 'color-canvas'],
  ['color-warn', 'color-warn-bg'],
  ['color-warn', 'color-canvas'],
  ['color-bad', 'color-bad-bg'],
  ['color-bad', 'color-canvas'],
  ['color-info', 'color-info-bg'],
  ['color-info', 'color-canvas'],
  ['color-on-primary', 'color-ok'],
  ['color-on-primary', 'color-bad'],
  ['color-on-primary', 'color-info'],
  ['color-on-primary', 'color-ink'],
];

// Non-text: input borders, focus ring, selected-row accent bar need 3:1 (WCAG 1.4.11).
const nonText: [string, string][] = [
  ['color-control', 'color-canvas'],
  ['focus-ring-color', 'color-canvas'],
  ['focus-ring-color', 'color-primary-soft'],
  ['color-primary-line', 'color-canvas'],
];

describe('design tokens: WCAG AA', () => {
  it.each(text)('text %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(nonText)('non-text %s on %s is at least 3:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
  it('brand orange is NOT usable as a white-text fill (documented reason for primary-solid)', () => {
    expect(contrast('color-on-primary', 'color-primary')).toBeLessThan(4.5);
  });
  it('legacy accent names still resolve to the new tokens', () => {
    expect(colour('color-accent')).toBe(colour('color-primary-solid'));
    expect(colour('color-accent-tint')).toBe(colour('color-primary-soft'));
  });
});
