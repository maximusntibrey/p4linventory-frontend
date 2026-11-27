import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { server } from '../mocks/server';
import { mockSession, resetMockStore } from '../mocks/handlers';
import { resetCsrfCache } from '../api/client';
import './domMatchers';
import { handlerDrawerOpen } from '../api/menu';

// jsdom has no canvas; axe asks for a 2D context. Returning null keeps axe working and silences the jsdom "Not implemented: getContext" noise without adding a canvas package.
HTMLCanvasElement.prototype.getContext = () => null;

expect.extend(matchers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  handlerDrawerOpen(false); // the drawer state is a module-level SWR cache: do not leak it between tests
  server.resetHandlers();
  mockSession.loggedIn = false;
  mockSession.role = 'super_admin';
  mockSession.loginId = undefined;
  mockSession.mustChange = false;
  mockSession.workingBranch = undefined;
  resetMockStore();
  resetCsrfCache();
  document.cookie = 'csrftoken=; Max-Age=0; path=/';
});
afterAll(() => server.close());
