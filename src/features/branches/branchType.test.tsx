import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { warehouse } from '../../mocks/data';
import { server } from '../../mocks/server';
import { apiError, capture, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const pick = (name: string) =>
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: 'Branch Type' })).getByRole('radio', {
      name: new RegExp(name),
    }),
  );
const rowOf = (text: string) =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .find((r) => r.textContent?.includes(text))!;

describe('branch type (contract 0.6.0)', () => {
  it('shows each location type as text plus icon in the list', async () => {
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('cell', { name: 'Accra Branch' });
    expect(within(rowOf('Central Warehouse')).getByText('Warehouse')).toBeTruthy();
    expect(within(rowOf('Accra Branch')).getByText('Normal Branch')).toBeTruthy();
  });

  it('filters by type through the branch_type query', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get('/api/v1/branches/', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('branch_type'));
        return undefined;
      }),
    );
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('cell', { name: 'Accra Branch' });
    fireEvent.click(screen.getByRole('radio', { name: 'Warehouse' }));
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'Accra Branch' })).toBeNull());
    expect(await screen.findByRole('cell', { name: warehouse.name })).toBeTruthy();
    expect(seen).toContain('warehouse');
  });

  it('the type is required: both types are offered with a description, and saving without one is refused', async () => {
    const post = capture('post', '/api/v1/branches/', () => HttpResponse.json({}, { status: 201 }));
    server.use(post.handler);
    const { container } = renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    await screen.findByRole('cell', { name: 'Central Warehouse' });
    click('Add a branch');
    expect(screen.getByRole('radiogroup', { name: 'Branch Type' })).toBeTruthy();
    expect(screen.getByText('(required)')).toBeTruthy();
    expect(screen.getByText(/central store/i)).toBeTruthy();
    type('Code', 'ZZ');
    type('Name', 'Zed');
    click('Save branch');
    expect(await screen.findByText('Choose a branch type.')).toBeTruthy();
    expect(post.seen).toHaveLength(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sends warehouse in the body and shows the server 400 on the Branch Type field', async () => {
    const post = capture('post', '/api/v1/branches/', () =>
      apiError(400, 'validation_error', 'Check the highlighted fields.', [
        { field: 'branch_type', message: 'A warehouse already exists.' },
      ]),
    );
    server.use(post.handler);
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    await screen.findByRole('cell', { name: 'Central Warehouse' });
    click('Add a branch');
    type('Code', 'W2');
    type('Name', 'Second warehouse');
    pick('Warehouse');
    click('Save branch');
    await waitFor(() => expect(post.seen).toHaveLength(1));
    expect(post.seen[0].body).toEqual({
      code: 'W2',
      name: 'Second warehouse',
      branch_type: 'warehouse',
    });
    const group = screen.getByRole('radiogroup', { name: 'Branch Type' });
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByText('A warehouse already exists.').length).toBeGreaterThanOrEqual(2);
  });

  it('mock server end to end: a missing type is refused on the field, a second warehouse is then added', async () => {
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    await screen.findByRole('cell', { name: 'Central Warehouse' });
    click('Add a branch');
    type('Code', 'W2');
    type('Name', 'Second warehouse');
    click('Save branch');
    expect(await screen.findByText('Choose a branch type.')).toBeTruthy();
    pick('Warehouse');
    click('Save branch');
    expect((await screen.findByRole('status')).textContent).toContain('Branch saved.');
    expect(await screen.findByRole('cell', { name: 'Second warehouse' })).toBeTruthy();
  });

  it('edit shows the current type and sends it back', async () => {
    const patch = capture('patch', '/api/v1/branches/1/', () => HttpResponse.json(warehouse));
    server.use(patch.handler);
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('cell', { name: 'Central Warehouse' });
    click('Edit Central Warehouse');
    expect(
      (
        within(screen.getByRole('radiogroup', { name: 'Branch Type' })).getByRole('radio', {
          name: /Warehouse/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    click('Save branch');
    await waitFor(() => expect(patch.seen).toHaveLength(1));
    expect(patch.seen[0].body).toMatchObject({ branch_type: 'warehouse' });
  });
});
