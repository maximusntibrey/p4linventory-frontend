import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Home, KeyRound } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import {
  AppShell,
  Button,
  CommandPalette,
  CompactBar,
  QuickLink,
  QuickLinkGrid,
  PageHeader,
  Pagination,
  ProfilePanel,
  Sidebar,
  Toolbar,
  useCommandShortcut,
} from '.';
import { renderApp } from '../../test/renderApp';

/** jsdom has no media queries: pretend the screen is a phone. */
const phone = (matches: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );

beforeEach(() => phone(true));
afterEach(() => vi.unstubAllGlobals());

describe('AppShell on a phone', () => {
  it('draws the compact bar only: no sidebar, no top bar, no Menu button', async () => {
    const { container } = render(
      <MemoryRouter>
        <AppShell
          sidebar={
            <Sidebar
              sections={[{ label: 'Menu', items: [{ to: '/', label: 'Home', icon: Home }] }]}
            />
          }
          topbar={<p>desktop top bar</p>}
          compactBar={
            <CompactBar search={{ label: 'Search or jump to…', onOpen: () => undefined }} />
          }
        >
          <p>page body</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    expect(screen.queryByText('desktop top bar')).toBeNull();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('CompactBar', () => {
  it('is only the field that opens the palette: no user text, no profile button', () => {
    const onOpen = vi.fn();
    render(<CompactBar search={{ label: 'Search or jump to…', onOpen }} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Search or jump to/ }));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.queryByText('Ama Boateng')).toBeNull();
  });
});

describe('ProfilePanel', () => {
  const setup = (switchable: boolean) => {
    const p = { onSwitch: vi.fn(), onChangePassword: vi.fn(), onLogout: vi.fn() };
    const view = render(
      <ProfilePanel
        user={{ name: 'Ama Boateng', loginId: 'USR-0001', role: 'Branch Admin', location: 'Osu' }}
        branch={{ name: 'Osu', onSwitch: switchable ? p.onSwitch : undefined }}
        notificationsText="No notifications yet"
        onChangePassword={p.onChangePassword}
        onLogout={p.onLogout}
      />,
    );
    return { ...p, ...view };
  };
  it('shows the four sections and fires the actions', async () => {
    const { onSwitch, onChangePassword, onLogout, container } = setup(true);
    for (const name of ['Profile', 'Working branch', 'Security', 'Notifications']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('USR-0001')).toBeInTheDocument();
    expect(screen.getByText('Permanent location')).toBeInTheDocument();
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch working branch' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(onSwitch).toHaveBeenCalled();
    expect(onChangePassword).toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('offers no switch when the caller does not pass one', () => {
    setup(false);
    expect(screen.queryByRole('button', { name: 'Switch working branch' })).toBeNull();
  });
});

describe('CommandPalette as the phone navigator', () => {
  const items = [
    { id: '/', label: 'Home', group: 'Menu', icon: Home },
    { id: 'pw', label: 'Change password', group: 'Account', icon: KeyRound },
    { id: 'bell', label: 'Notifications', group: 'Account', disabled: 'No notifications yet' },
  ];
  it('groups items under headings, lists a disabled item that does nothing, and skips it on Enter', async () => {
    const onSelect = vi.fn();
    render(
      <CommandPalette
        open
        onClose={() => undefined}
        label="Go"
        items={items}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Account' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Notifications/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'notif' } });
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(await axe(document.body)).toHaveNoViolations();
  });
  it('Ctrl+K calls the opener', () => {
    const onOpen = vi.fn();
    const Probe = () => (useCommandShortcut(onOpen), null);
    render(<Probe />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('PageHeader on a phone', () => {
  it('collapses two or more actions into one Actions button and closes the drawer on use', () => {
    const run = vi.fn();
    render(
      <PageHeader
        title="Items"
        actions={
          <>
            <Button onClick={run}>New item</Button>
            <Button>Import</Button>
          </>
        }
      />,
    );
    expect(screen.queryByRole('button', { name: 'New item' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Actions' })).getByRole('button', {
        name: 'New item',
      }),
    );
    expect(run).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('keeps a single action inline', () => {
    render(<PageHeader title="Items" actions={<Button>New item</Button>} />);
    expect(screen.getByRole('button', { name: 'New item' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions' })).toBeNull();
  });
});

describe('Toolbar on a phone', () => {
  it('keeps search and the primary action; sort, export and extras sit behind Filters', () => {
    const onExport = vi.fn();
    render(
      <Toolbar
        search={{ label: 'Search items', value: '', onChange: () => undefined }}
        sort={{ value: 'a', options: [{ value: 'a', label: 'A' }], onChange: () => undefined }}
        onExport={onExport}
        primary={{ label: 'Add item', onClick: () => undefined }}
      />,
    );
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const drawer = screen.getByRole('dialog', { name: 'Filters' });
    expect(within(drawer).getByLabelText('Sort by')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('shows no Filters button when there is nothing behind it', () => {
    render(<Toolbar search={{ label: 'Search', value: '', onChange: () => undefined }} />);
    expect(screen.queryByRole('button', { name: 'Filters' })).toBeNull();
  });
});

describe('Pagination on a phone', () => {
  it('shows previous, a page indicator and next; rows per page is in a drawer', () => {
    const onPage = vi.fn();
    const onSize = vi.fn();
    render(
      <Pagination
        page={2}
        pageCount={5}
        onPageChange={onPage}
        pageSize={10}
        onPageSizeChange={onSize}
      />,
    );
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'First' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPage).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole('button', { name: 'Rows' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Rows per page' }), {
      target: { value: '25' },
    });
    expect(onSize).toHaveBeenCalledWith(25);
  });
});

describe('QuickLink', () => {
  it('is a link or a button, shows a real count with words, and none at zero', () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <QuickLinkGrid label="Quick links">
          <QuickLink to="/receive" icon={Home} label="Receive" count={3} countLabel="waiting" />
          <QuickLink to="/stock" icon={Home} label="Stock" count={0} countLabel="low" />
          <QuickLink onClick={onClick} icon={Home} label="Osu" detail="Working branch" />
        </QuickLinkGrid>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Receive.*3.*waiting/ })).toHaveAttribute(
      'href',
      '/receive',
    );
    expect(screen.getByRole('link', { name: 'Stock' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Osu/ }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('CommandPalette profile section', () => {
  it('folds the profile, opens it on request, and hides it while searching', () => {
    const { rerender } = render(
      <CommandPalette
        open
        onClose={() => undefined}
        label="Go"
        items={[{ id: '/', label: 'Home' }]}
        onSelect={() => undefined}
        profile={<p>profile body</p>}
      />,
    );
    expect(screen.getByText('Profile').closest('details')).not.toHaveAttribute('open');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ho' } });
    expect(screen.queryByText('Profile')).toBeNull();
    rerender(<></>);
  });
});

describe('the signed-in app on a phone (Mantis: temporary drawer, hamburger, more menu)', () => {
  it('opens the menu from the hamburger and keeps the profile and branch controls in the header menus', async () => {
    renderApp('/', { as: 'branch_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    const bar = screen.getAllByRole('banner')[0];
    // Phones: the branch controls are not in the header itself, they live in the profile menu.
    expect(within(bar).queryByRole('button', { name: 'Switch branch' })).toBeNull();
    fireEvent.click(within(bar).getByRole('button', { name: 'open more menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open profile menu' }));
    expect(await screen.findByRole('button', { name: 'Log out' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/account/password'));
    fireEvent.click(
      within(screen.getAllByRole('banner')[0]).getByRole('button', { name: 'open drawer' }),
    );
    expect(await screen.findByRole('link', { name: 'Stock' })).toBeInTheDocument();
  });
  it('Home on a phone shows the stat cards and quick actions', async () => {
    renderApp('/', { as: 'branch_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(await screen.findByText('Quick actions')).toBeInTheDocument();
    expect(await screen.findByText('Low stock items')).toBeInTheDocument();
  });
});
