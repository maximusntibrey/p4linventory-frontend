// Screenshots of OUR app in mock mode for comparison with docs/ui-reference and for the mobile audit.
// Run `VITE_API_MODE=mock npx vite --port 5174` first. Usage: node scripts/ui-verification.mjs [baseUrl] [outDir] [widths]
// Reports horizontal overflow (page scroll), tap targets under 44 px and elements wider than the viewport, per route and width.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5174';
const out = process.argv[3] ?? 'docs/ui-verification';
const WIDTHS = (process.argv[4] ?? '360,390,768,1280').split(',').map(Number);
const ROUTES = [
  ['dashboard', '/'],
  ['items', '/items'],
  ['items-new', '/items/new'],
  ['items-import', '/items/import'],
  ['stock', '/stock'],
  ['branches', '/branches'],
  ['users', '/users'],
  ['users-new', '/users/new'],
  ['audit-logs', '/audit-logs'],
  ['sell', '/sell'],
  ['sales', '/sell/sales'],
  ['find', '/find'],
  ['goods-receipts', '/goods-receipts'],
  ['dispatches', '/dispatches'],
  ['dispatches-new', '/dispatches/new'],
  ['receive', '/receive'],
  ['shortfalls', '/shortfalls'],
  ['password', '/account/password'],
];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const issues = [];

for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/login');
  await page.getByLabel('Login ID').waitFor();
  await page.screenshot({ path: `${out}/login-${w}.png` });
  await page.getByLabel('Login ID').fill('SA-0001');
  await page.getByLabel('Password').fill('mock-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { level: 1, name: 'Home' }).waitFor();
  const check = async (name) => {
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const vw = window.innerWidth;
      const small = [
        ...document.querySelectorAll(
          'main button, main a[href], main input, main select, header button',
        ),
      ]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          return (
            b.width > 0 &&
            b.height > 0 &&
            (b.height < 43.5 || b.width < 43.5) &&
            e.type !== 'hidden' &&
            e.type !== 'checkbox' &&
            e.type !== 'radio'
          );
        })
        .map(
          (e) =>
            `${e.tagName.toLowerCase()}:${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`,
        );
      const wide = [...document.querySelectorAll('main *')].filter(
        (e) => !e.closest('thead') && e.getBoundingClientRect().right > vw + 1,
      ).length;
      return { over: document.documentElement.scrollWidth - vw, small: small.slice(0, 6), wide };
    });
    if (r.over > 0) issues.push(`${name}-${w}: page scrolls sideways by ${r.over}px`);
    if (r.wide > 0) issues.push(`${name}-${w}: ${r.wide} element(s) past the right edge`);
    if (r.small.length) issues.push(`${name}-${w}: small targets ${r.small.join('; ')}`);
    await page.screenshot({ path: `${out}/${name}-${w}.png` });
  };
  await check('dashboard');
  await page.getByRole('button', { name: 'open drawer' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${out}/${w >= 1266 ? 'dashboard-toggled' : 'dashboard-drawer'}-${w}.png`,
  });
  if (w < 1266) await page.keyboard.press('Escape');
  for (const [name, path] of ROUTES.slice(1)) {
    await page.evaluate((p) => {
      history.pushState({}, '', p);
      dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await page.locator('main').waitFor();
    await check(name);
  }
  await ctx.close();
}
await browser.close();
console.log(issues.length ? issues.join('\n') : 'no issues');
