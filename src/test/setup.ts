import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { server } from '../mocks/server';
import { mockSession } from '../mocks/handlers';
import { resetCsrfCache } from '../api/client';

expect.extend(matchers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  mockSession.loggedIn = false;
  mockSession.role = 'super_admin';
  mockSession.loginId = undefined;
  mockSession.mustChange = false;
  resetCsrfCache();
  document.cookie = 'csrftoken=; Max-Age=0; path=/';
});
afterAll(() => server.close());
