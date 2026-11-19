# p4linventory-frontend

React frontend for the Payless4Laptops Inventory & Warehouse System. It shows what the API allows and reports what the API rejects; it never decides a business rule. The backend lives in the separate repository `eqp4l-backend`; its published OpenAPI contract is the only link between the two.

## Project documents

| File | What it is |
|---|---|
| [TASKS.md](TASKS.md) | Enforced rules, git workflow and the step list. Steps for this repo are ticked here |
| [SKILLS.md](SKILLS.md) | Technical standards, AI agent rules, and this repo's install register (Appendix A) |
| [docs/project/](docs/project/README.md) | Copies of the project requirements: overview, frontend, backend, DevOps, gaps, and background documents |

Precedence: `1-Overview-and-Sprints`, `2-Frontend-Requirements`, `3-Backend-Requirements` and `4-DevOps-Requirements` win; `TASKS.md` and `SKILLS.md` follow them; documents 5 and 6 are background only. The originals were PDF files; only the Markdown conversions are kept in git (no binaries).

## Status

Sprint 1. Tooling is in place (step F1.0, TASKS section 2.4): React with TypeScript and Vite, Tailwind with the design tokens, React Router, TanStack Query, react-hook-form with zod, MSW, Vitest, React Testing Library, axe-core, Playwright, ESLint and Prettier. There is one placeholder page and no screens yet. Versions are in `SKILLS.md` Appendix A.

## Local setup

1. Set the git identity locally (TASKS 1.2).
2. Use the Node.js version in `.nvmrc` (Node 26 LTS), then install the exact locked versions:

   ```
   npm ci
   npx playwright install chromium
   ```

3. Install the pre-commit hooks (file checks, ESLint, Prettier and secret blocking, step T.3). The ESLint and Prettier hooks use `node_modules`, so run `npm ci` first:

   ```
   pre-commit install --allow-missing-config
   pre-commit run --all-files
   ```

4. Optionally copy `.env.example` to `.env.local` to change a value (the defaults work). Real `.env` files are git-ignored. Never put a secret in a `VITE_*` variable: it ends up in the browser bundle.

## Run it locally (Windows)

Start the **backend first** (see the `eqp4l-backend` README; it serves on http://127.0.0.1:8000), then the frontend.

Prerequisites: Git for Windows, Node.js 26.13.1 (`.nvmrc`; 26.13.x is accepted with a warning) and npm 11. Install or update Node with `nvm install 26.13.1; nvm use 26.13.1`, or `winget install OpenJS.NodeJS --version 26.13.1`, or `fnm install 26.13.1`.

```powershell
git clone https://github.com/maximusntibrey/p4linventory-frontend.git
cd p4linventory-frontend
git checkout sprint/1-foundations
npm ci
npm run dev
```

Or one command that checks Node and npm, runs `npm ci` if needed, warns if the backend is down and starts the server: `.\scripts\dev.ps1` (Git Bash or Linux: `bash scripts/dev.sh`).

- App: http://localhost:5173 . UI kit (development only): http://localhost:5173/ui-kit . There is no login or app shell yet (F1.3).
- **How it talks to the backend:** the dev server proxies `/api`, `/health`, `/admin` and `/static` to `VITE_BACKEND_URL` (default `http://127.0.0.1:8000`), so the browser sees one origin and the session and CSRF cookies work without CORS set-up. Check it: http://localhost:5173/health/ . Copy `.env.example` to `.env.local` only if you need to change a value.
- `VITE_API_MODE=real|mock` (default `real`). `mock` (MSW) is wired up in F1.4.
- Dev logins arrive with backend step B2.5. Their LOCAL ONLY passwords come from your own backend `.env` (copied from the backend `.env.example`).
- Browser tests: `npx playwright install chromium`, then `npm run test:e2e`. Not needed for `npm run dev` or `npm run check`.

Common errors:

| Symptom | Fix |
|---|---|
| `Port 5173 is already in use` | Find it: `netstat -ano \| findstr :5173`, then `taskkill /PID <pid> /F` (or close the other dev server). The port is fixed on purpose |
| `npm warn EBADENGINE` | Node is older than 26.13.1. Only a warning; update with the commands above |
| Prettier or ESLint complain about line endings (`Delete CR`) | Files must be LF. `.gitattributes` forces LF; if an old clone has CRLF first commit or back up your own edits (the next step discards uncommitted changes), then run `git add --renormalize .` and `git checkout -- .` |
| `dev.ps1 cannot be loaded, running scripts is disabled` | `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1`, or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `/health/` or API calls return 502/500 in the browser | The backend is not running on `VITE_BACKEND_URL`. Start it first |
| http://127.0.0.1:5173 does not load | Vite listens on `localhost` (IPv6 `::1`); use http://localhost:5173 |

## Commands

| Command | What it does |
|---|---|
| `npm run check` | **The single check command (T.24).** Lint, format check, type check, unit and component tests (with axe accessibility checks), production build, `npm audit`. Must be green before every pull request; CI runs it in the `check` job |
| `npm run test:e2e` | Playwright smoke test against the built app at 360 px (builds, then serves with `vite preview`). CI runs it after the check command |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run test:watch` | Vitest in watch mode |
| `npm run format` | Apply Prettier formatting |
| `npm run api:types` | Generate TypeScript types from `openapi/openapi.yaml` into `src/api/schema.gen.ts` (the contract arrives with B1.3; the client is F1.4) |
