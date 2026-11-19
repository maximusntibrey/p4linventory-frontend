// Fails if the production bundle contains the dev-only UI kit demo (F1.1).
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(dir);
if (files.length === 0) {
  console.error('check-dist: dist/assets is empty; run the build first');
  process.exit(1);
}
const leaks = files.filter((f) => readFileSync(new URL(f, dir), 'utf8').includes('UiKitDemo'));
if (leaks.length > 0) {
  console.error(`check-dist: UiKitDemo found in production bundle: ${leaks.join(', ')}`);
  process.exit(1);
}
console.log(`check-dist: ok (${files.length} files, no UiKitDemo)`);
