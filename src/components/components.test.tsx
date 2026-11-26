import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { Home } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { Field } from './Field';
import { Nav } from './Nav';
import { StatusBadge } from './StatusBadge';
import type { Status } from './StatusBadge';
import { TopBar } from './TopBar';

describe('Button', () => {
  it('shows a visible label, icon hidden from assistive tech, 44 px target class, click works', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button icon={Home} onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.className).toContain('min-h-11');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Card', () => {
  it('renders children with no a11y violations', async () => {
    const { container } = render(
      <Card>
        <p>Hello</p>
      </Card>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Field', () => {
  it('links label, hint and inline error to the input', async () => {
    const { container } = render(<Field label="Quantity" hint="Whole numbers" error="Too many" />);
    const input = screen.getByLabelText('Quantity');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const described = input.getAttribute('aria-describedby')!.split(' ');
    expect(described).toHaveLength(2);
    expect(screen.getByText('Too many').closest('p')?.id).toBe(described[1]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no error wiring without an error', () => {
    render(<Field label="Name" />);
    const input = screen.getByLabelText('Name');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('StatusBadge', () => {
  it.each<[Status, string]>([
    ['in-stock', 'In stock'],
    ['low', 'Low'],
    ['out', 'Out of stock'],
    ['error', 'Error'],
    ['active', 'Active'],
    ['pending', 'Pending activation'],
    ['suspended', 'Suspended'],
    ['deactivated', 'Deactivated'],
  ])('%s shows text and an icon, not colour alone', async (status, text) => {
    const { container } = render(<StatusBadge status={status} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('TopBar', () => {
  it('shows branch, user and labelled actions', async () => {
    const onLogout = vi.fn();
    const onSwitchBranch = vi.fn();
    const { container } = render(
      <TopBar
        branchName="Accra"
        userId="SA-0001"
        onLogout={onLogout}
        onSwitchBranch={onSwitchBranch}
      />,
    );
    expect(screen.getByText('Accra')).toBeTruthy();
    expect(screen.getByText('SA-0001')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Switch branch' }));
    expect(onSwitchBranch).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('draws no Switch branch button when the API does not allow switching', () => {
    render(<TopBar branchName="Accra" userId="USR-0001" onLogout={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Switch branch' })).toBeNull();
  });

  it('disables Log out until it is wired', () => {
    render(<TopBar branchName="Accra" userId="SA-0001" />);
    expect((screen.getByRole('button', { name: 'Log out' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe('Nav', () => {
  it('renders labelled links and marks the current page', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Nav items={[{ to: '/', label: 'Home', icon: Home }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('gives the active item an indicator bar, so the cue is not colour alone', () => {
    render(
      <MemoryRouter initialEntries={['/stock']}>
        <Nav
          items={[
            { to: '/', label: 'Home', icon: Home },
            { to: '/stock', label: 'Stock', icon: Home },
          ]}
        />
      </MemoryRouter>,
    );
    const bar = (name: string) =>
      screen.getByRole('link', { name }).querySelector('[data-active-indicator]');
    expect(bar('Stock')).not.toBeNull();
    expect(bar('Home')).toBeNull();
  });
});
