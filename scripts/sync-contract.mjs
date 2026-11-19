// Refreshes the vendored API contract (openapi/openapi.yaml) from the backend repo.
//
//   node scripts/sync-contract.mjs <path-or-url> [--expect <version>] [--allow-older]
//
// The source is the backend's openapi/openapi.yaml (a file path or an http(s) URL). The script
// refuses a file that is not OpenAPI 3.1, refuses a lower version than the vendored one (unless
// --allow-older) and, with --expect, refuses any version but the one named. It then copies the file
// and regenerates src/api/schema.gen.ts. Commit both: `npm run check` fails if they disagree.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load } from 'js-yaml';

const target = new URL('../openapi/openapi.yaml', import.meta.url);

export function readContractVersion(text) {
  const doc = load(text);
  if (typeof doc !== 'object' || doc === null) throw new Error('not a YAML mapping');
  if (typeof doc.openapi !== 'string' || !doc.openapi.startsWith('3.1')) {
    throw new Error(`expected OpenAPI 3.1, found ${String(doc.openapi)}`);
  }
  const version = doc.info?.version;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`info.version must be MAJOR.MINOR.PATCH, found ${String(version)}`);
  }
  return version;
}

export function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

async function readSource(source) {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`GET ${source} answered ${response.status}`);
    return response.text();
  }
  return readFileSync(source, 'utf8');
}

async function main(argv) {
  const args = argv.filter((a) => a !== '--allow-older');
  const allowOlder = args.length !== argv.length;
  const expectIndex = args.indexOf('--expect');
  const expected = expectIndex >= 0 ? args[expectIndex + 1] : undefined;
  const source = args.find(
    (a, i) => !a.startsWith('--') && (expectIndex < 0 || i !== expectIndex + 1),
  );
  if (!source) {
    console.error(
      'usage: node scripts/sync-contract.mjs <path-or-url> [--expect <version>] [--allow-older]',
    );
    process.exit(2);
  }

  const text = (await readSource(source)).replace(/\r\n/g, '\n');
  const incoming = readContractVersion(text);
  if (expected !== undefined && incoming !== expected) {
    console.error(`sync-contract: source is v${incoming}, expected v${expected}; nothing written`);
    process.exit(1);
  }
  if (existsSync(target)) {
    const current = readContractVersion(readFileSync(target, 'utf8'));
    if (compareVersions(incoming, current) < 0 && !allowOlder) {
      console.error(
        `sync-contract: source v${incoming} is older than the vendored v${current}; nothing written (use --allow-older)`,
      );
      process.exit(1);
    }
    console.log(`sync-contract: vendored v${current} -> v${incoming}`);
  }
  mkdirSync(fileURLToPath(new URL('../openapi/', import.meta.url)), { recursive: true });
  writeFileSync(target, text);

  const root = fileURLToPath(new URL('../', import.meta.url));
  const run = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules/openapi-typescript/bin/cli.js'),
      'openapi/openapi.yaml',
      '-o',
      'src/api/schema.gen.ts',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  if (run.status !== 0) process.exit(run.status ?? 1);
  console.log(`sync-contract: openapi/openapi.yaml is v${incoming}; types regenerated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main(process.argv.slice(2));
}
