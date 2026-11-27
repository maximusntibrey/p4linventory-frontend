import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { renderApp } from './test/renderApp';

describe('app shell', () => {
  it('home shows top bar, nav and heading', async () => {
    const { container } = renderApp('/', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    expect(screen.getAllByRole('banner')[0]).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('unknown path shows 404 inside the shell with a way home', async () => {
    const { container } = renderApp('/nope', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('design-system showcase gate (design_system.view)', () => {
  it('opens for the Super Admin only', async () => {
    const sa = renderApp('/design-system', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Design system' })).toBeTruthy();
    sa.unmount();
    renderApp('/design-system', { as: 'warehouse_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });
});
