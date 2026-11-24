// "Sync contract" step: copy the published OpenAPI file into contract/openapi.yaml, then regenerate the typed client.
// Usage: npm run contract:sync -- <path-or-url>
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const src = process.argv[2];
if (!src) {
  console.error('Usage: npm run contract:sync -- <path-or-url>');
  process.exit(1);
}

mkdirSync('contract', { recursive: true });
if (/^https?:\/\//.test(src)) {
  const res = await fetch(src);
  if (!res.ok) {
    console.error(`Download failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  writeFileSync('contract/openapi.yaml', await res.text());
} else {
  copyFileSync(src, 'contract/openapi.yaml');
}

mkdirSync('src/api', { recursive: true });
const gen = spawnSync('npm', ['run', 'contract:gen'], { stdio: 'inherit', shell: true });
process.exit(gen.status ?? 1);
