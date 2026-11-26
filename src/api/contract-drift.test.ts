import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const run = (schema: string) =>
  spawnSync(process.execPath, ['scripts/contract-drift.mjs', 'contract/openapi.yaml', schema], {
    encoding: 'utf8',
  });

describe('contract drift check', () => {
  it('passes when src/api/schema.d.ts matches the contract', () => {
    const r = run('src/api/schema.d.ts');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  }, 30_000);

  it('fails when the generated client has drifted from the contract', () => {
    const dir = mkdtempSync(join(tmpdir(), 'drift-'));
    const drifted = join(dir, 'schema.d.ts');
    copyFileSync('src/api/schema.d.ts', drifted);
    writeFileSync(drifted, readFileSync(drifted, 'utf8') + '\nexport type Drift = string;\n');
    const r = run(drifted);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('drift');
  }, 30_000);
});
