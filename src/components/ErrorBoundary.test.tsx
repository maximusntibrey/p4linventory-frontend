import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { render } from '../test/renderUi';
import { renderApp } from '../test/renderApp';
import { server } from '../mocks/server';
import { ErrorBoundary, RouteBoundary } from './ErrorBoundary';

function Boom({ explode }: { explode: boolean }): React.ReactElement {
  if (explode) throw new Error('page exploded');
  return <p>Page fine</p>;
}

const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => undefined);

describe('ErrorBoundary', () => {
  it('shows message, Retry and a link Home instead of a blank page; axe clean', async () => {
    const spy = quiet();
    const { container } = render(
      <RouteBoundary>
        <Boom explode />
      </RouteBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toMatch(/something went wrong/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to home/i }).getAttribute('href')).toBe('/');
    expect(await axe(container)).toHaveNoViolations();
    spy.mockRestore();
  });

  it('Retry renders the page again', () => {
    const spy = quiet();
    function Page() {
      const [fixed, setFixed] = useState(false);
      return (
        <>
          <button onClick={() => setFixed(true)}>fix</button>
          <ErrorBoundary>
            <Boom explode={!fixed} />
          </ErrorBoundary>
        </>
      );
    }
    render(<Page />);
    fireEvent.click(screen.getByRole('button', { name: 'fix' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('Page fine')).toBeTruthy();
    spy.mockRestore();
  });

  it('the bare outermost boundary also never leaves a blank screen', () => {
    const spy = quiet();
    render(
      <ErrorBoundary bare>
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toMatch(/something went wrong/i);
    expect(screen.getByRole('link', { name: /back to home/i })).toBeTruthy();
    spy.mockRestore();
  });

  it('a routed page that throws shows the error state inside the app shell', async () => {
    const spy = quiet();
    // An unknown status makes the item page throw while rendering.
    server.use(
      http.get('/api/v1/costed-items/1/', () =>
        HttpResponse.json({ id: 1, status: 'bogus', name: 'X', sku: 'S' }),
      ),
    );
    renderApp('/items/1', { as: 'super_admin' });
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.getAllByRole('banner').length).toBeGreaterThan(0);
    spy.mockRestore();
  });

  it('an item with no subtype (null from the real API) opens instead of going blank', async () => {
    renderApp('/items/2', { as: 'super_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Dell 65W charger' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
