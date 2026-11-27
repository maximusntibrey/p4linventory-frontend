// Design-token guard (wired into `npm run check`): fails on raw colours and inline style props.
// Allowed: src/themes/** (the Mantis theme and palette: the ONLY place brand colours live)
// (src/assets/** and test files are exempt too.)
// Existing offenders live in scripts/design-token-baseline.json and may only shrink.
// Usage: node scripts/check-design-tokens.mjs [--root <dir>] [--write-baseline]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const root = resolve(rootArg >= 0 ? args[rootArg + 1] : '.');
const writeBaseline = args.includes('--write-baseline');
const baselinePath = join(root, 'scripts', 'design-token-baseline.json');

const COLOUR =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch)\(/g;
const INLINE_STYLE = /\bstyle\s*=\s*(?!\{\s*widthStyle\()/g;
const EXEMPT = (p) =>
  p.startsWith('src/themes/') ||
  p === 'src/utils/colorUtils.js' || // vendored: builds rgba(var(--x)) strings, holds no colour
  p.startsWith('src/assets/') ||
  p.startsWith('src/test/') ||
  p.startsWith('src/mocks/') ||
  /\.test\.[tj]sx?$/.test(p) ||
  p.endsWith('.d.ts');

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|css|jsx?)$/.test(e.name)) yield full;
  }
}

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

const found = {};
const src = join(root, 'src');
if (existsSync(src)) {
  for (const file of walk(src)) {
    const rel = relative(root, file).split(sep).join('/');
    if (EXEMPT(rel)) continue;
    const text = stripComments(readFileSync(file, 'utf8'));
    const colors = (text.match(COLOUR) ?? []).length;
    // Vendored Mantis template files (.js/.jsx) keep their own inline styles; our code is TypeScript.
    const inlineStyles = /\.(css|jsx?)$/.test(rel) ? 0 : (text.match(INLINE_STYLE) ?? []).length;
    if (colors || inlineStyles) found[rel] = { colors, inlineStyles };
  }
}

if (writeBaseline) {
  writeFileSync(baselinePath, JSON.stringify(found, null, 2) + '\n');
  console.log(`baseline written: ${Object.keys(found).length} files`);
  process.exit(0);
}

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : {};
const errors = [];
for (const [file, n] of Object.entries(found)) {
  const allowed = baseline[file] ?? { colors: 0, inlineStyles: 0 };
  if (n.colors > allowed.colors)
    errors.push(
      `${file}: ${n.colors} raw colour(s), allowed ${allowed.colors}. Use a design token.`,
    );
  if (n.inlineStyles > allowed.inlineStyles)
    errors.push(
      `${file}: ${n.inlineStyles} inline style prop(s), allowed ${allowed.inlineStyles}. Use tokens/classes or widthStyle().`,
    );
}
const total = Object.values(baseline).reduce((a, b) => a + b.colors + b.inlineStyles, 0);
const stale = Object.keys(baseline).filter(
  (f) =>
    !found[f] ||
    found[f].colors < baseline[f].colors ||
    found[f].inlineStyles < baseline[f].inlineStyles,
);
if (errors.length) {
  console.error('design-token check FAILED:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(
  `design-token check ok. baseline violations: ${total}` +
    (stale.length
      ? ` (shrunk in ${stale.length} file(s): run with --write-baseline to ratchet down)`
      : ''),
);
