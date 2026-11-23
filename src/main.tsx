import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiMode } from './config';
import { AppRoutes } from './routes';
import './index.css';

const queryClient = new QueryClient();

async function start() {
  if (!import.meta.env.PROD && apiMode === 'mock') {
    const { worker } = await import('./mocks/browser');
    await worker.start();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
