// Screenshots of OUR app in mock mode (run `VITE_API_MODE=mock npx vite --port 5174` first) for comparison with docs/ui-reference.
// Usage: node scripts/ui-verification.mjs [baseUrl] [outDir]. Also reports horizontal overflow per page and width.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5174';
const out = process.argv[3] ?? 'docs/ui-verification';
const WIDTHS = [360, 390, 768, 1024, 1280, 1536];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const overflow = [];

async function shot(page, name, w) {
  await page.waitForTimeout(500);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) overflow.push(`${name}-${w}: +${over}px`);
  await page.screenshot({ path: `${out}/${name}-${w}.png` });
}

for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/login');
  await page.getByLabel('Login ID').waitFor();
  await shot(page, 'login', w);
  await page.getByLabel('Login ID').fill('SA-0001');
  await page.getByLabel('Password').fill('mock-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Home' }).waitFor();
  await page.waitForTimeout(800);
  await shot(page, 'dashboard-default', w);
  await page.getByRole('button', { name: 'open drawer' }).click();
  await page.waitForTimeout(600);
  await shot(page, w >= 1266 ? 'dashboard-toggled' : 'dashboard-drawer', w);
  if (w < 1266) await page.keyboard.press('Escape');
  await ctx.close();
}
await browser.close();
console.log(overflow.length ? `OVERFLOW ${overflow.join('; ')}` : 'no horizontal overflow');
