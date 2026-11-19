import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { apiMode } from './config/apiMode.ts';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

// Mock mode (VITE_API_MODE=mock) is development only. `import.meta.env.DEV` is a build-time
// constant, so production builds drop this branch and MSW never ships (scripts/check-dist.mjs).
async function enableMocking(): Promise<void> {
  if (import.meta.env.DEV && apiMode === 'mock') {
    const { worker } = await import('./mocks/browser.ts');
    await worker.start({ onUnhandledFrame: 'bypass' });
  }
}

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
