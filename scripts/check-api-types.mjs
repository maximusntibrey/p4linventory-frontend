// Fails when src/api/schema.gen.ts is stale, i.e. differs from what `npm run api:types` would
// generate from openapi/openapi.yaml. Part of `npm run check` (and so of CI).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const committed = join(root, 'src/api/schema.gen.ts');
const dir = mkdtempSync(join(tmpdir(), 'api-types-'));
const fresh = join(dir, 'schema.gen.ts');

try {
  const run = spawnSync(
    process.execPath,
    [join(root, 'node_modules/openapi-typescript/bin/cli.js'), 'openapi/openapi.yaml', '-o', fresh],
    { cwd: root, encoding: 'utf8' },
  );
  if (run.status !== 0) {
    console.error(`check-api-types: generation failed\n${run.stdout}${run.stderr}`);
    process.exit(1);
  }
  const normalise = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  if (normalise(committed) !== normalise(fresh)) {
    console.error(
      'check-api-types: src/api/schema.gen.ts is stale; run `npm run api:types` and commit the result',
    );
    process.exit(1);
  }
  console.log('check-api-types: ok (generated types match openapi/openapi.yaml)');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
