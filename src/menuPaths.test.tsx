import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { meByRole } from './mocks/data';
import type { MockRole } from './mocks/data';
import { renderApp } from './test/renderApp';

/** The paths the server's /me gives (menu and home tiles) must each be a real screen, never the 404 page. */
describe('every menu and home-tile path of every role opens a screen', () => {
  for (const role of Object.keys(meByRole) as MockRole[]) {
    const me = meByRole[role];
    const paths = [...new Set([...me.menu, ...me.home_links].map((e) => e.path))];
    it(`${role}: ${paths.join(' ')}`, async () => {
      for (const path of paths) {
        const { unmount } = renderApp(path, { as: role });
        await waitFor(() =>
          expect(screen.queryAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0),
        );
        expect(screen.queryByRole('heading', { name: 'Page not found' }), path).toBeNull();
        unmount();
      }
    });
  }
});
