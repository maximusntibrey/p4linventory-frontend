import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Home, Tag } from 'lucide-react';
import { Card, CommandPalette, Topbar } from '.';

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
