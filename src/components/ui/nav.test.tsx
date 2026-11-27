import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { Boxes, Home, Settings } from 'lucide-react';
import { AppShell, Logo, Sidebar, Topbar } from '.';
import type { SidebarSection } from '.';

const sections: SidebarSection[] = [
  { items: [{ to: '/', label: 'Home', icon: Home }] },
  {
    label: 'Inventory',
    items: [
      { to: '/items', label: 'Items', icon: Boxes, badge: 12 },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];
const wrap = (ui: React.ReactNode, at = '/items') => (
  <MemoryRouter initialEntries={[at]}>{ui}</MemoryRouter>
);

describe('Sidebar', () => {
  it('groups items, marks the active one, shows badges and slots, and has no axe violations', async () => {
    const { container } = render(
      wrap(<Sidebar sections={sections} header={<Logo />} footer={<p>Help centre</p>} />),
    );
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Items/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Help centre')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('collapses, keeps link names for assistive tech, and reports the change', async () => {
    const onCollapsedChange = vi.fn();
    const { container } = render(
      wrap(<Sidebar sections={sections} onCollapsedChange={onCollapsedChange} />),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('title', 'Settings');
    expect(await axe(container)).toHaveNoViolations();
  });
  it('slots receive the collapsed state', () => {
    render(
      wrap(
        <Sidebar
          sections={sections}
          defaultCollapsed
          header={(c) => <p>{c ? 'mark' : 'full'}</p>}
        />,
      ),
    );
    expect(screen.getByText('mark')).toBeInTheDocument();
  });
});

describe('Topbar', () => {
  it('has search, bell with count and a user pill', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Topbar
        search={{ label: 'Search everything', value: '', onChange: () => {} }}
        notifications={{ count: 2, onClick }}
        user={{ name: 'Ama Boateng', email: 'ama@example.com' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 2 new' }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText('ama@example.com')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('Ctrl+K and Cmd+K focus the search box', () => {
    render(<Topbar search={{ label: 'Search everything', value: '', onChange: () => {} }} />);
    const box = screen.getByRole('searchbox', { name: 'Search everything' });
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(box).toHaveFocus();
    box.blur();
    fireEvent.keyDown(document, { key: 'K', metaKey: true });
    expect(box).toHaveFocus();
  });
  it('the user pill is a button when it has a handler', () => {
    const onClick = vi.fn();
    render(<Topbar user={{ name: 'Ama Boateng', email: 'a@b.c', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ama Boateng, a@b.c' }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('AppShell', () => {
  it('lays out sidebar, topbar and main, with a skip link', async () => {
    const { container } = render(
      wrap(
        <AppShell
          sidebar={<Sidebar sections={sections} />}
          topbar={<Topbar user={{ name: 'Ama B', email: 'a@b.c' }} />}
        >
          <p>page body</p>
        </AppShell>,
      ),
    );
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveTextContent('page body');
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
