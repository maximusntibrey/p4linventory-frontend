import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { branchA } from '../../mocks/data';
import { server } from '../../mocks/server';
import { apiError, capture, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

describe('branches list', () => {
  it('lists locations with status as text and an icon, and has no axe violations', async () => {
    const { container } = renderApp('/branches', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Branches' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Accra Branch' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Central Warehouse' })).toBeTruthy();
    expect(screen.getAllByText('Active')).toHaveLength(3);
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(3);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a user who may only view sees no manage buttons', async () => {
    renderApp('/branches', { as: 'branch_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    expect(screen.queryByRole('button', { name: /Add a branch/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Deactivate/ })).toBeNull();
  });

  it('when the API answers 403 the 403 page is shown', async () => {
    server.use(http.get('/api/v1/branches/', () => apiError(403, 'permission_denied', 'No.')));
    renderApp('/branches', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('a failed load offers Try again', async () => {
    // The top-bar branch filter also reads /branches/ (with kind=branch); only fail the page's own list.
    let failed = false;
    server.use(
      http.get('/api/v1/branches/', ({ request }) => {
        if (failed || new URL(request.url).searchParams.has('kind')) return undefined;
        failed = true;
        return HttpResponse.error();
      }),
    );
    renderApp('/branches', { as: 'super_admin' });
    expect((await screen.findByRole('alert')).textContent).toContain('Could not reach the server.');
    click('Try again');
    expect(await screen.findByRole('heading', { level: 1, name: 'Branches' })).toBeTruthy();
  });
});

describe('add and edit a branch', () => {
  it('creates a branch with an Idempotency-Key and says it was saved', async () => {
    const post = capture('post', '/api/v1/branches/', () =>
      HttpResponse.json({ ...branchA, id: 9, code: 'TAM', name: 'Tamale Branch' }, { status: 201 }),
    );
    server.use(post.handler);
    const { container } = renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    click('Add a branch');
    expect(await axe(container)).toHaveNoViolations();
    type('Code', 'TAM');
    type('Name', 'Tamale Branch');
    click('Save branch');
    expect((await screen.findByRole('status')).textContent).toContain('Branch saved.');
    expect(post.seen).toHaveLength(1);
    expect(post.seen[0].body).toEqual({ code: 'TAM', name: 'Tamale Branch' });
    expect(post.seen[0].key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('checks required fields before sending', async () => {
    const post = capture('post', '/api/v1/branches/', () => HttpResponse.json({}, { status: 201 }));
    server.use(post.handler);
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    click('Add a branch');
    click('Save branch');
    expect(await screen.findByText('Enter a code.')).toBeTruthy();
    expect(screen.getByText('Enter a name.')).toBeTruthy();
    expect(post.seen).toHaveLength(0);
  });

  it('shows the API field error next to the field, keeps the form, and a retry resends the same key', async () => {
    let n = 0;
    const post = capture('post', '/api/v1/branches/', () => {
      n += 1;
      return apiError(400, 'validation_error', 'Check the highlighted fields.', [
        { field: 'code', message: 'A branch with this code exists.' },
      ]);
    });
    server.use(post.handler);
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    click('Add a branch');
    type('Code', 'ACC');
    type('Name', 'Another');
    click('Save branch');
    await waitFor(() => expect(n).toBe(1));
    const field = await screen.findAllByText('A branch with this code exists.');
    expect(field.length).toBeGreaterThanOrEqual(2); // summary and next to the field
    expect(screen.getByLabelText('Code').getAttribute('aria-invalid')).toBe('true');
    click('Save branch');
    await waitFor(() => expect(n).toBe(2));
    expect(post.seen[1].key).toBe(post.seen[0].key);
    type('Code', 'ACC2');
    click('Save branch');
    await waitFor(() => expect(n).toBe(3));
    expect(post.seen[2].key).not.toBe(post.seen[0].key);
  });

  it('a 403 on save is reported in plain words', async () => {
    server.use(
      capture('post', '/api/v1/branches/', () =>
        apiError(403, 'permission_denied', 'You cannot add branches.'),
      ).handler,
    );
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    click('Add a branch');
    type('Code', 'X');
    type('Name', 'X');
    click('Save branch');
    expect((await screen.findByRole('alert')).textContent).toContain('You cannot add branches.');
  });

  it('edits a branch: form is pre-filled and PATCH carries a key', async () => {
    const patch = capture('patch', '/api/v1/branches/2/', () =>
      HttpResponse.json({ ...branchA, name: 'Accra Central' }),
    );
    server.use(patch.handler);
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    click('Edit Accra Branch');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Accra Branch');
    type('Name', 'Accra Central');
    click('Save branch');
    expect((await screen.findByRole('status')).textContent).toContain('Branch saved.');
    expect(patch.seen[0].body).toEqual({ code: 'ACC', name: 'Accra Central' });
    expect(patch.seen[0].key).toBeTruthy();
  });
});

describe('deactivate with a confirm step', () => {
  it('nothing is sent until the user confirms, Cancel backs out', async () => {
    const post = capture('post', '/api/v1/branches/2/deactivate/', () =>
      HttpResponse.json({ ...branchA, is_active: false }),
    );
    server.use(post.handler);
    const { container } = renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    click('Deactivate Accra Branch');
    const group = await screen.findByRole('group', { name: /Deactivate Accra Branch\?/ });
    await waitFor(() => expect(document.activeElement).toBe(group));
    expect(await axe(container)).toHaveNoViolations();
    expect(post.seen).toHaveLength(0);
    fireEvent.click(within(group).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group')).toBeNull();
    expect(post.seen).toHaveLength(0);

    click('Deactivate Accra Branch');
    fireEvent.click(
      within(await screen.findByRole('group')).getByRole('button', { name: 'Yes, deactivate' }),
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      'Accra Branch is now deactivated.',
    );
    expect(post.seen).toHaveLength(1);
    expect(post.seen[0].key).toBeTruthy();
  });

  it('the API refusing (the warehouse) is shown inside the confirm step', async () => {
    renderApp('/branches', { as: 'super_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Branches' });
    click('Deactivate Central Warehouse');
    fireEvent.click(
      within(await screen.findByRole('group')).getByRole('button', { name: 'Yes, deactivate' }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'The warehouse cannot be deactivated.',
    );
  });

  it('a deactivated branch shows Deactivated and an Activate button', async () => {
    server.use(
      http.get('/api/v1/branches/', () =>
        HttpResponse.json({
          count: 1,
          page: 1,
          page_size: 25,
          next: null,
          previous: null,
          results: [{ ...branchA, is_active: false }],
        }),
      ),
    );
    renderApp('/branches', { as: 'super_admin' });
    expect(await screen.findByText('Deactivated')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Activate Accra Branch' })).toBeTruthy();
  });
});
