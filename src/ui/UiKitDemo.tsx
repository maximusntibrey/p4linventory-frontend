// Demo of the UI kit at /ui-kit (F1.1). Static sample data only; not linked from any menu.
import { Boxes, House, Inbox, Search, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { Button, Card, Field, Navigation, StatusBadge, TopBar } from './index.ts';
import type { NavItem } from './index.ts';

const sampleItems: NavItem[] = [
  { key: 'home', label: 'Home', icon: House, href: '#home', current: true },
  { key: 'sell', label: 'Sell', icon: ShoppingCart, href: '#sell' },
  { key: 'find', label: 'Find', icon: Search, href: '#find' },
  { key: 'stock', label: 'Stock', icon: Boxes, href: '#stock' },
  { key: 'receive', label: 'Receive', icon: Inbox, href: '#receive' },
];

export function UiKitDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="pb-24 md:pb-0 md:pl-20">
      <TopBar
        branchName="Sample branch"
        userId="USER-0001"
        onSwitchBranch={() => undefined}
        onLogout={() => undefined}
      />
      <main className="mx-auto flex max-w-screen-sm flex-col gap-4 p-4">
        <h1 className="text-2xl font-semibold text-grey-900">UI kit</h1>
        <Card title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Save</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="danger">Delete</Button>
            <Button disabled>Disabled</Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
              }}
            >
              Save changes
            </Button>
          </div>
        </Card>
        <Card title="Form fields">
          <div className="flex flex-col gap-4">
            <Field label="Quantity" hint="Whole units only." required />
            <Field
              label="Reason"
              defaultValue="x"
              error="That quantity is more than the stock at this branch."
            />
          </div>
        </Card>
        <Card title="Status badges">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="ok" label="In stock" />
            <StatusBadge status="low" label="Low" />
            <StatusBadge status="out" label="Out of stock" />
            <StatusBadge status="error" label="Error" />
          </div>
        </Card>
      </main>
      <Navigation items={sampleItems} />
    </div>
  );
}
