// Accessibility check for component tests (T.22), using axe-core directly.
// vitest-axe was not adopted: see SKILLS.md Appendix A (not maintained).
// jsdom has no layout or canvas, so the colour-contrast rule cannot run here;
// it runs in a real browser in the Playwright smoke test (e2e/).
import axe from 'axe-core';

export async function axeViolations(context: Element): Promise<axe.Result[]> {
  const results = await axe.run(context, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations;
}

/** Short, readable summary for assertion failures: "rule-id: help (n nodes)". */
export function describeViolations(violations: axe.Result[]): string[] {
  return violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)} nodes)`);
}
