// UI kit tests (F1.1): behaviour, accessibility (axe), focusability, 44 px tap
// classes and labelled icons. jsdom has no layout, so real 44 px measurements and
// keyboard activation (Enter/Space) are checked in the browser: e2e/ui-kit.spec.ts.
import { fireEvent, render, screen } from '@testing-library/react';
import { Boxes, House } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { axeViolations, describeViolations } from '../test/axe.ts';

import { Button, Card, Field, MAX_NAV_ITEMS, Navigation, StatusBadge, TopBar } from './index.ts';
import type { NavItem } from './index.ts';

async function expectNoAxeViolations(container: Element) {
  expect(describeViolations(await axeViolations(container))).toEqual([]);
}

describe('Button', () => {
  it('renders each variant, is focusable and fires onClick', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <>
        <Button onClick={onClick}>Save</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </>,
    );
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    expect(save).toHaveFocus();
    fireEvent.click(save);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(save).toHaveClass('min-h-tap', 'min-w-tap');
    await expectNoAxeViolations(container);
  });

  it('does not fire when disabled or loading, and loading is announced', () => {
    const onClick = vi.fn();
    render(
      <>
        <Button disabled onClick={onClick}>
          Off
        </Button>
        <Button loading onClick={onClick}>
          Busy
        </Button>
      </>,
    );
    const off = screen.getByRole('button', { name: 'Off' });
    const busy = screen.getByRole('button', { name: /Busy/ });
    expect(off).toBeDisabled();
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(off);
    fireEvent.click(busy);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Card', () => {
  it('shows its title as a heading and has no axe violations', async () => {
    const { container } = render(<Card title="Stock">Body</Card>);
    expect(screen.getByRole('heading', { name: 'Stock' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});

describe('Field', () => {
  it('links label, hint and error to the input', async () => {
    const { container } = render(
      <Field label="Quantity" hint="Whole units only." error="Too many." required />,
    );
    const input = screen.getByLabelText(/Quantity/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Whole units only. Too many.');
    expect(screen.getByText('(required)')).toBeInTheDocument();
    expect(input).toHaveClass('min-h-tap');
    input.focus();
    expect(input).toHaveFocus();
    await expectNoAxeViolations(container);
  });

  it('has no error state by default', () => {
    render(<Field label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });
});

describe('StatusBadge', () => {
  it('always shows text and an icon, never colour alone', async () => {
    const { container } = render(
      <>
        <StatusBadge status="ok" label="In stock" />
        <StatusBadge status="low" label="Low" />
        <StatusBadge status="out" label="Out of stock" />
        <StatusBadge status="error" label="Error" />
      </>,
    );
    for (const text of ['In stock', 'Low', 'Out of stock', 'Error']) {
      const badge = screen.getByText(text);
      expect(badge.querySelector('svg')).not.toBeNull();
    }
    await expectNoAxeViolations(container);
  });
});

describe('TopBar', () => {
  it('shows branch and user ID and labelled, working controls', async () => {
    const onSwitch = vi.fn();
    const onLogout = vi.fn();
    const { container } = render(
      <TopBar branchName="Accra" userId="U-7" onSwitchBranch={onSwitch} onLogout={onLogout} />,
    );
    expect(screen.getByText('Accra')).toBeInTheDocument();
    expect(screen.getByText('U-7')).toBeInTheDocument();
    const switchBtn = screen.getByRole('button', { name: 'Switch branch' });
    const logout = screen.getByRole('button', { name: 'Log out' });
    switchBtn.focus();
    expect(switchBtn).toHaveFocus();
    fireEvent.click(switchBtn);
    fireEvent.click(logout);
    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(switchBtn).toHaveClass('min-h-tap');
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
    await expectNoAxeViolations(container);
  });
});

describe('Navigation', () => {
  const items: NavItem[] = [
    { key: 'home', label: 'Home', icon: House, href: '#home', current: true },
    { key: 'stock', label: 'Stock', icon: Boxes, href: '#stock' },
  ];

  it('renders labelled links, marks the current one and is focusable', async () => {
    const { container } = render(<Navigation items={items} />);
    const nav = screen.getByRole('navigation', { name: 'Main menu' });
    expect(nav).toBeInTheDocument();
    const home = screen.getByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Stock' })).not.toHaveAttribute('aria-current');
    expect(home).toHaveClass('min-h-tap');
    home.focus();
    expect(home).toHaveFocus();
    // Phone: bottom tabs; desktop (md): icon rail.
    expect(nav).toHaveClass('bottom-0', 'md:inset-y-0', 'md:w-20');
    await expectNoAxeViolations(container);
  });

  it('shows at most 5 items and warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const many: NavItem[] = Array.from({ length: 7 }, (_, i) => ({
      key: `k${String(i)}`,
      label: `Item ${String(i)}`,
      icon: House,
      href: `#${String(i)}`,
    }));
    render(<Navigation items={many} />);
    expect(screen.getAllByRole('link')).toHaveLength(MAX_NAV_ITEMS);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn within the cap', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Navigation items={items} />);
    expect(warn).not.toHaveBeenCalled();
  });
});
