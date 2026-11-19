import { lazy, Suspense } from 'react';

// Demo page for the UI kit (F1.1): development only. `import.meta.env.DEV` is replaced by
// `false` at build time, so the lazy import is removed and the demo is not in the production bundle.
const UiKitDemo = import.meta.env.DEV
  ? lazy(() => import('./ui/UiKitDemo.tsx').then((m) => ({ default: m.UiKitDemo })))
  : null;

// Placeholder component for the tooling step (F1.0). The app shell (F1.3) and
// API client (F1.4) replace it. No screens or business rules.
export function App() {
  if (UiKitDemo && window.location.pathname === '/ui-kit') {
    return (
      <Suspense fallback={null}>
        <UiKitDemo />
      </Suspense>
    );
  }
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-4 p-4">
      <h1 className="font-display text-4xl font-normal tracking-wide text-grey-900">
        Payless4Laptops Inventory
      </h1>
      <p className="text-grey-700">The app is being set up. Screens arrive in the next steps.</p>
    </main>
  );
}
