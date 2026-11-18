// Install verification for T.18 and T.19 (TASKS 2.1 step 4): each library loads
// and does its basic job in this toolchain. Generic data only, no business rules.
import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('tooling smoke tests', () => {
  it('React Router renders the matching route', async () => {
    const router = createMemoryRouter(
      [
        { path: '/', element: <p>Root route</p> },
        { path: '/second', element: <p>Second route</p> },
      ],
      { initialEntries: ['/second'] },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('Second route')).toBeInTheDocument();
  });

  it('TanStack Query resolves a query', async () => {
    function Probe() {
      const query = useQuery({ queryKey: ['probe'], queryFn: () => Promise.resolve('loaded') });
      return <p>{query.data ?? 'loading'}</p>;
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('loaded')).toBeInTheDocument();
  });

  it('react-hook-form with a zod schema reports an inline error', async () => {
    const schema = z.object({ name: z.string().min(1, 'Enter a name') });
    type Values = z.infer<typeof schema>;
    function Probe() {
      const {
        register,
        handleSubmit,
        formState: { errors },
      } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '' } });
      return (
        <form
          onSubmit={(event) => {
            void handleSubmit(() => undefined)(event);
          }}
        >
          <label htmlFor="name">Name</label>
          <input id="name" {...register('name')} />
          {errors.name && <p role="alert">{errors.name.message}</p>}
          <button type="submit">Save</button>
        </form>
      );
    }
    render(<Probe />);
    screen.getByRole('button', { name: 'Save' }).click();
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a name');
  });

  it('lucide-react renders an outline icon next to its text label', () => {
    render(
      <button type="button">
        <Search aria-hidden="true" data-testid="icon" />
        <span>Find</span>
      </button>,
    );
    expect(screen.getByRole('button', { name: 'Find' })).toBeInTheDocument();
    expect(screen.getByTestId('icon').tagName.toLowerCase()).toBe('svg');
  });
});
