import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../api/queryClient';
import { mockSession } from '../mocks/handlers';
import type { MockRole } from '../mocks/data';
import { AppRoutes } from '../routes';

function Where() {
  return (
    <span hidden data-testid="where">
      {useLocation().pathname}
    </span>
  );
}

/** Renders the whole app at `path` against the MSW mocks. `as` starts a mock session for that role; omit it to start signed out. */
export function renderApp(path: string, opts: { as?: MockRole } = {}) {
  if (opts.as) {
    mockSession.loggedIn = true;
    mockSession.role = opts.as;
  }
  const client = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, client };
}
