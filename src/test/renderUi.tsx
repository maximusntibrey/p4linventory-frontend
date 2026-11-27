import { render as rtlRender } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider } from '../contexts/ConfigContext';
import ThemeCustomization from '../themes';

/** render() inside the Mantis theme and a router, for tests of shared components. */
export const render = (ui: ReactElement, options?: RenderOptions) =>
  rtlRender(ui, {
    wrapper: ({ children }) => (
      <ConfigProvider>
        <ThemeCustomization>
          <MemoryRouter>{children}</MemoryRouter>
        </ThemeCustomization>
      </ConfigProvider>
    ),
    ...options,
  });
