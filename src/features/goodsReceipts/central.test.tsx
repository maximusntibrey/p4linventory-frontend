import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { renderApp } from '../../test/renderApp';

describe('central warehouse user', () => {
  it('lands on the first menu screen, not a dashboard, 403 or blank page', async () => {
    renderApp('/', { as: 'central_warehouse' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Stock' })).toBeTruthy();
    expect(screen.queryByText(/403/)).toBeNull();
  });

  it('sees receipts read-only and without cost; axe clean', async () => {
    const { container } = renderApp('/receive-stock', { as: 'central_warehouse' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Receipts' })).toBeTruthy();
    expect(await screen.findByText(/GRN-000001/)).toBeTruthy();
    expect(screen.queryByText(/GHS/)).toBeNull();
    expect(screen.queryByRole('button', { name: /review receipt/i })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the dispatch list has no New dispatch action', async () => {
    renderApp('/dispatch', { as: 'central_warehouse' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Dispatch' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /new dispatch/i })).toBeNull();
  });

  it('Warehouse Admin still records receipts', async () => {
    renderApp('/receive-stock', { as: 'warehouse_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Receive stock' })).toBeTruthy();
  });
});
