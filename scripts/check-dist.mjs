// Fails if the production bundle (dist/) contains development-only code:
//   - the UI kit demo (F1.1),
//   - MSW or its service worker (F1.4): mocks must never reach production.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Text that must not appear in any shipped file, and file names that must not exist.
export const FORBIDDEN_TEXT = ['UiKitDemo', 'mockServiceWorker', '@mswjs', 'mswjs', 'msw/'];
export const FORBIDDEN_FILE = /mockServiceWorker|(^|[\\/._-])msw([\\/._-]|$)/i;

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

/** Returns a list of problems found under `distDir` (empty when clean). Throws if it is empty. */
export function scanDist(distDir) {
  const files = listFiles(distDir);
  if (files.length === 0) throw new Error('dist is empty; run the build first');
  const problems = [];
  for (const file of files) {
    const name = relative(distDir, file);
    if (FORBIDDEN_FILE.test(name)) problems.push(`${name}: forbidden file name`);
    if (!/\.(js|mjs|css|html|map|json|txt|webmanifest)$/i.test(name)) continue;
    const text = readFileSync(file, 'utf8');
    for (const word of FORBIDDEN_TEXT) {
      if (text.includes(word)) problems.push(`${name}: contains "${word}"`);
    }
  }
  return { files: files.length, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let result;
  try {
    result = scanDist(fileURLToPath(new URL('../dist/', import.meta.url)));
  } catch (error) {
    console.error(`check-dist: ${error.message}`);
    process.exit(1);
  }
  if (result.problems.length > 0) {
    console.error(
      `check-dist: development-only code in the production bundle:\n  ${result.problems.join('\n  ')}`,
    );
    process.exit(1);
  }
  console.log(`check-dist: ok (${result.files} files, no UiKitDemo, no MSW)`);
}
