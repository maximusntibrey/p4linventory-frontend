import { Home } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Nav } from './Nav';
import type { NavItem } from './Nav';
import { TopBar } from './TopBar';

// Placeholder: the real menu comes from API permissions (F2.2). No role logic here.
const placeholderNav: NavItem[] = [{ to: '/', label: 'Home', icon: Home }];

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar branchName="No branch selected" userId="Not signed in" />
      <div className="flex flex-1 flex-col md:flex-row">
        <Nav items={placeholderNav} />
        <main className="min-w-0 flex-1 p-4 pb-24 md:pb-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
