import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { components } from '../api';

export const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
export const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }));
export const where = () => screen.getByTestId('where').textContent;

/** An API error body for `server.use(...)` overrides. */
export const apiError = (
  status: number,
  code: string,
  message: string,
  errors: components['schemas']['Error']['errors'] = [],
) => HttpResponse.json({ code, message, errors }, { status });

/** Records the headers and JSON body of each request that reaches `path`, then answers with `reply`. */
export function capture(method: 'post' | 'put' | 'patch', path: string, reply: () => Response) {
  const seen: { key: string | null; body: unknown }[] = [];
  const handler = http[method](path, async ({ request }) => {
    seen.push({
      key: request.headers.get('Idempotency-Key'),
      body: request.headers.get('Content-Type')?.includes('json') ? await request.json() : null,
    });
    return reply();
  });
  return { seen, handler };
}

/** The user menu (name, role, branch controls, change password, log out) opens from the profile button in the header. */
export async function openProfile() {
  fireEvent.click(await screen.findByRole('button', { name: 'Open profile menu' }));
}
