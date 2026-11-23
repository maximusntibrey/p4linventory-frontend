import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { AppRoutes } from './routes';

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

describe('app shell', () => {
  it('home shows top bar, nav and heading', async () => {
    const { container } = at('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('unknown path shows 404 inside the shell with a way home', async () => {
    const { container } = at('/nope');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
