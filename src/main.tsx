import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import 'simplebar-react/dist/simplebar.min.css';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import { createQueryClient } from './api/queryClient';
import { apiMode } from './config';
import { ConfigProvider } from './contexts/ConfigContext';
import ThemeCustomization from './themes';
import { AppRoutes } from './routes';

const queryClient = createQueryClient();

async function start() {
  if (!import.meta.env.PROD && apiMode === 'mock') {
    const { worker } = await import('./mocks/browser');
    await worker.start();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <ThemeCustomization>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ThemeCustomization>
        </ConfigProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
