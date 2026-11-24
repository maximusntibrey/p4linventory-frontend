// Fails when src/api/schema.d.ts is not what openapi-typescript generates from contract/openapi.yaml.
// Usage: node scripts/contract-drift.mjs [contract] [schema]
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [contract = 'contract/openapi.yaml', schema = 'src/api/schema.d.ts'] = process.argv.slice(2);
const dir = mkdtempSync(join(tmpdir(), 'contract-'));
const out = join(dir, 'schema.d.ts');
try {
  const gen = spawnSync(
    process.execPath,
    ['node_modules/openapi-typescript/bin/cli.js', contract, '-o', out],
    {
      encoding: 'utf8',
    },
  );
  if (gen.status !== 0) {
    console.error(`Could not generate types from ${contract}:\n${gen.stderr}`);
    process.exit(1);
  }
  const norm = (f) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  if (norm(out) !== norm(schema)) {
    console.error(
      `Contract drift: ${schema} does not match ${contract}. Run npm run contract:gen.`,
    );
    process.exit(1);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
