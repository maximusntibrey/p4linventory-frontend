// Production output must hold no mock tooling: no MSW worker script, no MSW code.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const problems = [];
if (existsSync('dist/mockServiceWorker.js')) problems.push('dist/mockServiceWorker.js exists');
const assets = join('dist', 'assets');
for (const f of existsSync(assets) ? readdirSync(assets) : []) {
  if (!f.endsWith('.js')) continue;
  if (/mockServiceWorker|setupWorker|@mswjs/.test(readFileSync(join(assets, f), 'utf8'))) {
    problems.push(`dist/assets/${f} contains MSW code`);
  }
}
if (!existsSync('dist/index.html')) problems.push('dist/index.html missing (run the build first)');
if (problems.length) {
  console.error(`Production build check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('dist ok: no mock worker or MSW code');
