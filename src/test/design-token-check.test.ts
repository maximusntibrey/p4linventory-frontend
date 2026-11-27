import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

let dir = '';
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

function project(files: Record<string, string>, baseline?: object) {
  dir = mkdtempSync(join(tmpdir(), 'dtc-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(join(dir, p, '..'), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  if (baseline) {
    mkdirSync(join(dir, 'scripts'));
    writeFileSync(join(dir, 'scripts', 'design-token-baseline.json'), JSON.stringify(baseline));
  }
  const r = spawnSync(
    process.execPath,
    [join(process.cwd(), 'scripts', 'check-design-tokens.mjs'), '--root', dir],
    { encoding: 'utf8' },
  );
  return { code: r.status, out: r.stdout + r.stderr };
}

describe('scripts/check-design-tokens.mjs', () => {
  it('passes clean token usage', () => {
    expect(
      project({ 'src/A.tsx': 'export const A = () => <p className="text-ink bg-primary-soft" />;' })
        .code,
    ).toBe(0);
  });
  it.each([
    ['hex', 'const c = "#ff6b00";'],
    ['short hex', 'const c = "#fff";'],
    ['rgb', 'const c = "rgb(1 2 3)";'],
    ['hsl', 'const c = "hsl(10 10% 10%)";'],
  ])('fails raw %s colour', (_n, body) => {
    const r = project({ 'src/A.tsx': body });
    expect(r.code).toBe(1);
    expect(r.out).toContain('src/A.tsx');
  });
  it('fails an inline style prop', () => {
    expect(
      project({ 'src/A.tsx': 'export const A = () => <p style={{ color: "red" }} />;' }).code,
    ).toBe(1);
  });
  it('allows the documented widthStyle helper', () => {
    expect(
      project({ 'src/A.tsx': 'export const A = () => <p style={widthStyle(40)} />;' }).code,
    ).toBe(0);
  });
  it('allows the theme files, assets and tests', () => {
    const r = project({
      'src/themes/palette.js': 'export const a = "#ff6b00";',
      'src/assets/logo.svg.ts': 'export const s = "#ff6b00";',
      'src/A.test.tsx': 'const c = "#fff";',
    });
    expect(r.code).toBe(0);
  });
  it('ignores colours in comments and URL fragments', () => {
    expect(
      project({
        'src/A.tsx': '// was #ff6b00\n/* #fff */\nconst h = "/#main"; const u = "http://x";',
      }).code,
    ).toBe(0);
  });
  it('allows baselined files up to their count, no more', () => {
    const body = 'const c = "#ff6b00";';
    expect(
      project({ 'src/A.tsx': body }, { 'src/A.tsx': { colors: 1, inlineStyles: 0 } }).code,
    ).toBe(0);
    expect(
      project(
        { 'src/A.tsx': body + 'const d = "#fff";' },
        { 'src/A.tsx': { colors: 1, inlineStyles: 0 } },
      ).code,
    ).toBe(1);
  });
  it('the real repo passes with its committed baseline', () => {
    const r = spawnSync(process.execPath, ['scripts/check-design-tokens.mjs'], {
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('baseline violations: 0');
  });
});
