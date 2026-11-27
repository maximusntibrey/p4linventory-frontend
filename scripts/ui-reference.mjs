// Comparison screenshots of the public Mantis Free demo (images only; no demo code is downloaded).
// Usage: node scripts/ui-reference.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = (process.argv[2] ?? 'https://mantisdashboard.com/free').replace(/\/$/, '');
const out = process.argv[3] ?? 'docs/ui-reference';
const WIDTHS = [360, 390, 768, 1024, 1280, 1536];
const PAGES = [
  ['login', '/login'],
  ['register', '/register'],
  ['dashboard-default', '/dashboard/default'],
  ['sample-page', '/sample-page'],
  ['typography', '/typography'],
  ['color', '/color'],
  ['shadows', '/shadows'],
];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
let blocked = 0;
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  for (const [name, path] of PAGES) {
    try {
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: false });
      const isApp = !['login', 'register'].includes(name);
      if (isApp) {
        const toggle = page.getByRole('button', { name: /open drawer/i });
        if (await toggle.count()) {
          await toggle.first().click();
          await page.waitForTimeout(700);
          await page.screenshot({
            path: `${out}/${name}-${w}-${w >= 1266 ? 'toggled' : 'drawer'}.png`,
          });
        }
      }
    } catch (e) {
      blocked++;
      console.log(`FAIL ${name} ${w}: ${String(e.message).split('\n')[0]}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`done, failures: ${blocked}`);
