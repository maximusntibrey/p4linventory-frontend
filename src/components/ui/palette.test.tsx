import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Home, Tag } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import {
  Card,
  CommandPalette,
  LinkButton,
  SegmentedControl,
  StatCard,
  StatsStrip,
  Topbar,
} from '.';

const items = [
  { id: '/', label: 'Home', icon: Home },
  { id: '/items', label: 'Items', hint: 'Menu', icon: Tag },
];

describe('Card', () => {
  it('renders children with the caller classes', () => {
    render(
      <Card className="flex" data-testid="c">
        hello
      </Card>,
    );
    expect(screen.getByTestId('c')).toHaveTextContent('hello');
    expect(screen.getByTestId('c').className).toContain('flex');
  });
});

describe('CommandPalette', () => {
  const setup = () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const view = render(
      <CommandPalette open onClose={onClose} label="Go to" items={items} onSelect={onSelect} />,
    );
    return { onSelect, onClose, ...view };
  };
  it('lists the items, filters by typing and opens the first match on Enter (keyboard only)', async () => {
    const { onSelect } = setup();
    expect(screen.getByRole('searchbox', { name: 'Go to' })).toHaveFocus();
    expect(screen.getAllByRole('button', { name: /Home|Items/ })).toHaveLength(2);
    const box = screen.getByRole('searchbox');
    fireEvent.change(box, { target: { value: 'ite' } });
    expect(screen.queryByRole('button', { name: /Home/ })).toBeNull();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });
  it('says so when nothing matches, and picks by click', () => {
    const { onSelect } = setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByRole('status')).toHaveTextContent('Nothing matches');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Home/ }));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });
  it('closes on Escape and has no axe violations', async () => {
    const { onClose } = setup();
    expect(await axe(document.body)).toHaveNoViolations();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Topbar command search and unavailable bell', () => {
  it('the search button and Ctrl+K both open the palette', () => {
    const onOpen = vi.fn();
    render(<Topbar commandSearch={{ label: 'Search or jump to…', onOpen }} />);
    fireEvent.click(screen.getByRole('button', { name: /Search or jump to/ }));
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
  it('an unavailable bell says why and does nothing', () => {
    const onClick = vi.fn();
    render(<Topbar notifications={{ count: 0, onClick, unavailable: 'No notifications yet' }} />);
    const bell = screen.getByRole('button', { name: 'No notifications yet' });
    expect(bell).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(bell);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('SegmentedControl form use (legend, required, error)', () => {
  it('shows a visible legend, marks it required, wires the error and has no axe violations', async () => {
    const { container } = render(
      <SegmentedControl
        variant="cards"
        label="Branch Type"
        legend="Branch Type"
        required
        error="A warehouse already exists."
        value=""
        onValueChange={() => {}}
        options={[
          { value: 'branch', label: 'Normal Branch', description: 'A shop' },
          { value: 'warehouse', label: 'Warehouse', description: 'Holds stock' },
        ]}
      />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Branch Type' });
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(group).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('(required)')).toBeInTheDocument();
    expect(screen.getByText('A warehouse already exists.').closest('p')?.id).toBe(
      group.getAttribute('aria-describedby'),
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('LinkButton', () => {
  it('is a link with a visible label that wears the button look', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/items/new" icon={Home}>
          New item
        </LinkButton>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'New item' });
    expect(link).toHaveAttribute('href', '/items/new');
    expect(link.className).toMatch(/min-h-11/);
  });
});

describe('StatsStrip columns', () => {
  it('a 3-cell strip has no 4-column layout, so no empty cell', () => {
    render(
      <StatsStrip label="Three" columns={3}>
        <StatCard label="A" value={1} />
        <StatCard label="B" value={2} />
        <StatCard label="C" value={3} />
      </StatsStrip>,
    );
    const strip = screen.getByLabelText('Three');
    expect(strip.className).toContain('sm:grid-cols-3');
    expect(strip.className).not.toContain('md:grid-cols-4');
  });
});
