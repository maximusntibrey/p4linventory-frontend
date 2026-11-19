// @vitest-environment node
// scripts/check-dist.mjs must fail when MSW or the dev-only demo is in the production bundle (F1.4).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { scanDist } from '../../scripts/check-dist.mjs';

const dirs: string[] = [];
function fakeDist(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'dist-'));
  dirs.push(dir);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('scanDist', () => {
  it('passes a clean bundle', () => {
    const result = scanDist(
      fakeDist({ 'index.html': '<div id="root"></div>', 'assets/app.js': 'console.log(1)' }),
    );
    expect(result.problems).toEqual([]);
  });

  it('fails when the MSW worker file is shipped', () => {
    const result = scanDist(fakeDist({ 'index.html': 'x', 'mockServiceWorker.js': '// worker' }));
    expect(result.problems.join()).toContain('mockServiceWorker.js');
  });

  it('fails when MSW code is inside a bundle', () => {
    const result = scanDist(fakeDist({ 'assets/app.js': 'import "@mswjs/interceptors"' }));
    expect(result.problems.join()).toContain('@mswjs');
  });

  it('fails when a chunk is named for msw', () => {
    expect(scanDist(fakeDist({ 'assets/msw-abc123.js': '1' })).problems).not.toEqual([]);
  });

  it('still catches the UI kit demo', () => {
    expect(scanDist(fakeDist({ 'assets/app.js': 'const UiKitDemo = 1' })).problems).not.toEqual([]);
  });

  it('refuses an empty dist', () => {
    expect(() => scanDist(fakeDist({}))).toThrow(/empty/);
  });
});
