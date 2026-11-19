// Browser worker for `VITE_API_MODE=mock` (development only; see src/main.tsx).
import { setupWorker } from 'msw/browser';

import { handlers } from './handlers.ts';

export const worker = setupWorker(...handlers);
