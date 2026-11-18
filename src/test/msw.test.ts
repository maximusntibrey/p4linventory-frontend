// @vitest-environment node
// Install verification for T.21: MSW intercepts a request in the test runner.
// The shared handlers built from the OpenAPI contract arrive with F1.4.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const server = setupServer(
  http.get('http://api.test/ping', () => HttpResponse.json({ status: 'ok' })),
);

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

describe('MSW', () => {
  it('returns the mocked response', async () => {
    const response = await fetch('http://api.test/ping');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
