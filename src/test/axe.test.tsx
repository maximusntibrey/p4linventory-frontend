// Install verification for axe-core (T.22): the helper must catch a real
// violation, so a passing accessibility test is not a vacuous pass.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { axeViolations } from './axe.ts';

describe('axe helper', () => {
  it('reports an icon-only button with no accessible name', async () => {
    const { container } = render(
      <button type="button">
        <svg aria-hidden="true" />
      </button>,
    );
    const ids = (await axeViolations(container)).map((v) => v.id);
    expect(ids).toContain('button-name');
  });
});
