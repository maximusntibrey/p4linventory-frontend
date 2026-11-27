// Runs the real-API Playwright project. `node scripts/e2e-real.mjs direct` = cross-origin (production-style CORS).
import { spawnSync } from 'node:child_process';

const direct = process.argv[2] === 'direct';
const r = spawnSync(
  'npx',
  ['playwright', 'test', '-c', 'playwright.real.config.ts', ...process.argv.slice(3)],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, E2E_DIRECT: direct ? '1' : '0' },
  },
);
process.exit(r.status ?? 1);
