import { expect } from 'vitest';

/** Tiny dependency-free subset of jest-dom matchers (jest-dom is not in TASKS section 2). */
type R = { pass: boolean; message: () => string };
const el = (v: unknown) => v as HTMLElement;
const result = (pass: boolean, what: string): R => ({ pass, message: () => what });

const describedBy = (e: HTMLElement) =>
  (e.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ');

expect.extend({
  toBeInTheDocument: (v) =>
    result(el(v)?.isConnected === true, 'expected element to be in the document'),
  toHaveAttribute(v, name: string, value?: string) {
    const e = el(v);
    const has = e.hasAttribute(name);
    const pass = value === undefined ? has : has && e.getAttribute(name) === value;
    return result(
      pass,
      `expected ${name}${value === undefined ? '' : `="${value}"`}, got ${e.getAttribute(name)}`,
    );
  },
  toHaveTextContent(v, text: string) {
    const t = el(v).textContent ?? '';
    return result(t.includes(text), `expected text "${t}" to contain "${text}"`);
  },
  toBeDisabled: (v) =>
    result((el(v) as HTMLButtonElement).disabled === true, 'expected element to be disabled'),
  toHaveFocus: (v) =>
    result(
      document.activeElement === v,
      `expected focus, active is ${document.activeElement?.tagName}`,
    ),
  toHaveValue: (v, value: string) =>
    result(
      (el(v) as HTMLInputElement).value === value,
      `expected value ${value}, got ${(el(v) as HTMLInputElement).value}`,
    ),
  toBeChecked: (v) =>
    result((el(v) as HTMLInputElement).checked === true, 'expected element to be checked'),
  toHaveClass: (v, cls: string) => result(el(v).classList.contains(cls), `expected class ${cls}`),
  toHaveAccessibleDescription(v, text: string) {
    const d = describedBy(el(v));
    return result(d === text, `expected description "${text}", got "${d}"`);
  },
});

interface DomMatchers {
  toBeInTheDocument(): void;
  toHaveAttribute(name: string, value?: string): void;
  toHaveTextContent(text: string): void;
  toBeDisabled(): void;
  toHaveFocus(): void;
  toHaveValue(value: string): void;
  toBeChecked(): void;
  toHaveClass(cls: string): void;
  toHaveAccessibleDescription(text: string): void;
}
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends DomMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends DomMatchers {}
}
