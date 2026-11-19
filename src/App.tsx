import { UiKitDemo } from './ui/UiKitDemo.tsx';

// Placeholder component for the tooling step (F1.0). The app shell (F1.3) and
// API client (F1.4) replace it. No screens or business rules.
export function App() {
  // Demo page for the UI kit (F1.1): reachable by URL only, not part of any menu.
  if (window.location.pathname === '/ui-kit') return <UiKitDemo />;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold text-grey-900">Payless4Laptops Inventory</h1>
      <p className="text-grey-700">The app is being set up. Screens arrive in the next steps.</p>
    </main>
  );
}
