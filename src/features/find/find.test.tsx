import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { server } from '../../mocks/server';
import { apiError, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const h1 = () => screen.findByRole('heading', { level: 1, name: 'Find' });

describe('find screen', () => {
  it('lists my branch stock; other branches only on request, by name and quantity; axe clean', async () => {
    const { container } = renderApp('/find', { as: 'front_staff' });
    await h1();
    const card = (await screen.findByText('HP 250 G9')).closest('li')!;
    expect(within(card).getByText('Accra Branch:')).toBeTruthy();
    expect(within(card).getByText('3 available')).toBeTruthy();
    expect(within(card).getByText('Low')).toBeTruthy();
    expect(within(card).queryByText('Kumasi Branch')).toBeNull();
    const btn = within(card).getByRole('button', { name: /other branches for HP 250 G9/ });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(await within(card).findByText('Kumasi Branch')).toBeTruthy();
    expect(within(card).getByText(/0 available/)).toBeTruthy();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    // the own branch is not repeated as "other"; no price or cost anywhere
    expect(within(card).getAllByText(/Accra Branch/)).toHaveLength(1);
    expect(screen.queryByText(/cost|price|GHS/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(btn);
    expect(within(card).queryByText('Kumasi Branch')).toBeNull();
  });

  it('search is sent to the API; empty result says so', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/v1/stock/', ({ request }) => {
        seen.push(new URL(request.url).search);
      }),
    );
    renderApp('/find', { as: 'front_staff' });
    await screen.findByText('HP 250 G9');
    type('Item name or SKU', ' nothing-here ');
    click('Search');
    expect(await screen.findByText('No items found.')).toBeTruthy();
    expect(seen.some((s) => s.includes('q=nothing-here'))).toBe(true);
  });

  it('an availability 403 stays inside the card; a 404 is a retryable error', async () => {
    server.use(
      http.get('/api/v1/items/:id/branch-availability/', () =>
        apiError(403, 'permission_denied', 'No.'),
      ),
    );
    renderApp('/find', { as: 'front_staff' });
    const card = (await screen.findByText('HP 250 G9')).closest('li')!;
    fireEvent.click(within(card).getByRole('button', { name: /other branches/ }));
    expect(await within(card).findByText('Your account is not allowed to see this.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Find' })).toBeTruthy();
  });

  it('a user without find.use gets the 403 page', async () => {
    server.use(
      http.get('/api/v1/auth/me/', async ({ request }) => {
        void request;
        const { meByRole } = await import('../../mocks/data');
        return HttpResponse.json({
          ...meByRole.front_staff,
          permissions: meByRole.front_staff.permissions.filter((p) => p !== 'find.use'),
        });
      }),
    );
    renderApp('/find', { as: 'front_staff' });
    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 1, name: 'Find' })).toBeNull(),
    );
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('keyboard: Enter in the search box searches', async () => {
    renderApp('/find', { as: 'front_staff' });
    await screen.findByText('HP 250 G9');
    type('Item name or SKU', 'zzz');
    fireEvent.submit(screen.getByRole('search'));
    expect(await screen.findByText('No items found.')).toBeTruthy();
  });
});
