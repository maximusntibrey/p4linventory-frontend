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

4. Copy `.env.example` to `.env.local` and fill in local values. Real `.env` files are git-ignored. Never put a secret in a `VITE_*` variable: it ends up in the browser bundle.

## Commands

| Command | What it does |
|---|---|
| `npm run check` | **The single check command (T.24).** Lint, format check, type check, unit and component tests (with axe accessibility checks), production build, `npm audit`. Must be green before every pull request; CI runs it in the `check` job |
| `npm run test:e2e` | Playwright smoke test against the built app at 360 px (builds, then serves with `vite preview`). CI runs it after the check command |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run test:watch` | Vitest in watch mode |
| `npm run format` | Apply Prettier formatting |
| `npm run api:types` | Generate TypeScript types from `openapi/openapi.yaml` into `src/api/schema.gen.ts` (the contract arrives with B1.3; the client is F1.4) |
