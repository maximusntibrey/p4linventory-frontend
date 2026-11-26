import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Home } from 'lucide-react';
import { Field } from './Field';
import { StatusBadge } from './StatusBadge';
import type { Status } from './StatusBadge';
import { Button, Card } from './ui';

describe('Button', () => {
  it('shows a visible label, icon hidden from assistive tech, 44 px target class, click works', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button icon={Home} onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.className).toMatch(/min-h-(11|target)/);
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
