# Payless4Laptops Inventory: frontend

React + TypeScript + Vite, mobile-first. Requirements live in `docs/`.

## Run it locally (Windows)

1. Install Node.js (version in `.nvmrc`, currently 26) from nodejs.org.
2. In PowerShell, from this folder: `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1` (copies `.env.example` to `.env`, runs `npm ci` if needed, starts the dev server).
3. Open http://localhost:5173.

Or manually: `npm ci`, `copy .env.example .env`, `npm run dev`.

Modes (set `VITE_API_MODE` in `.env`):

- `mock`: MSW mock responses, no backend needed. Only in dev, and only when set explicitly; a production build is always `real`.
- `real` (anything else, including unset): in `npm run dev` the browser calls the same origin (http://localhost:5173) and the Vite proxy forwards `/api`, `/media` and `/health` to `VITE_BACKEND_URL` (default `http://localhost:8000`), so no CORS is involved. A production build calls `VITE_API_URL` (Railway sets the backend's public HTTPS origin before building). To test the production-style cross-origin path in dev, set `VITE_API_DIRECT=true` (then `VITE_API_URL` is used and the backend must allow the origin in its CORS settings).
- The backend must trust the dev origin for CSRF: its `CSRF_TRUSTED_ORIGINS` has to include `http://localhost:5173` (and `http://127.0.0.1:5173` if you browse that address).

## Commands

| Command                                  | What it does                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run check`                          | The one check: eslint (+a11y), prettier, tsc, vitest, contract drift, npm audit (high+), build + dist check |
| `npm run e2e`                            | Playwright smoke tests against `vite preview` (needs `npx playwright install chromium` once)                |
| `npm run contract:sync -- <path-or-url>` | Copy the published OpenAPI file into `contract/` and regenerate the client                                  |
| `npm run contract:gen`                   | Regenerate `src/api/schema.d.ts` from `contract/openapi.yaml`                                               |

The typed API client is generated from the contract only; never hand-write API types.
