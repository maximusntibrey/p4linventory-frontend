import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.tsx';
import { axeViolations, describeViolations } from './test/axe.ts';

describe('App placeholder (smoke test)', () => {
  it('renders the page heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Payless4Laptops Inventory' }),
    ).toBeInTheDocument();
  });

  it('has no axe accessibility violations', async () => {
    // Component-level scan; page-level rules (title, lang) run in e2e/smoke.spec.ts.
    const { container } = render(<App />);
    const violations = await axeViolations(container);
    expect(describeViolations(violations)).toEqual([]);
  });
});
