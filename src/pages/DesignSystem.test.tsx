import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { renderApp } from '../test/renderApp';

afterEach(() => vi.unstubAllEnvs());

describe('/design-system showcase', () => {
  it('renders for Super Admin, lazy-loaded, with every section reachable by keyboard tabs', async () => {
    vi.stubEnv('DEV', false);
    const { container } = renderApp('/design-system', { as: 'super_admin' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Design system' }, { timeout: 5000 }),
    ).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    for (const name of ['Actions and badges', 'Forms', 'Data', 'Feedback', 'App shell']) {
      fireEvent.click(screen.getByRole('tab', { name }));
      expect(screen.getByRole('tabpanel')).toBeTruthy();
      expect(await axe(container)).toHaveNoViolations();
    }
  }, 20_000);

  it('shows every data-table state and the bulk action bar', async () => {
    renderApp('/design-system', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Design system' }, { timeout: 5000 });
    fireEvent.click(screen.getByRole('tab', { name: 'Data' }));
    for (const state of ['ready', 'loading', 'error', 'empty']) {
      expect(screen.getByRole('table', { name: `Items, ${state} state` })).toBeTruthy();
    }
    expect(screen.getByText('1 Selected')).toBeTruthy();
  }, 20_000);

  it('is forbidden in production for a user who does not work across all branches', async () => {
    vi.stubEnv('DEV', false);
    renderApp('/design-system', { as: 'front_staff' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });
});
