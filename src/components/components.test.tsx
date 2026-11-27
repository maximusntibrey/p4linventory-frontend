import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../test/renderUi';
import { axe } from 'vitest-axe';
import { Home } from 'components/icons';
import { Button, Card, StatusWord, TextField } from './ui';
import type { Status } from './ui';

describe('Button', () => {
  it('shows a visible label, icon hidden from assistive tech, 44 px target class, click works', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button icon={Home} onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(parseFloat(getComputedStyle(btn).minHeight)).toBeGreaterThanOrEqual(44);
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
    const { container } = render(
      <TextField label="Quantity" hint="Whole numbers" error="Too many" />,
    );
    const input = screen.getByLabelText('Quantity');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const described = input.getAttribute('aria-describedby')!.split(' ');
    expect(described).toHaveLength(2);
    expect(screen.getByText('Too many').closest('p')?.id).toBe(described[1]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no error wiring without an error', () => {
    render(<TextField label="Name" />);
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
    const { container } = render(<StatusWord status={status} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
