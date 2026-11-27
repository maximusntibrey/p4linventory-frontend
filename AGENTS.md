# AGENTS.md

Payless4Laptops inventory and warehouse system, frontend only: React 19, TypeScript, Vite, MUI (Mantis Free template), TanStack Query, MSW mocks from `contract/openapi.yaml`. The backend lives in its own repo; the OpenAPI contract is the only link.

## Commands

- `npm install`, then `npm run dev` (Vite with the `/api` proxy; mock mode runs without the backend).
- `npm run check`: lint, format check, types, contract drift, design-token check, tests, audit, build, dist verification. Must be green before any PR and before merging to `main`.
- `npm run e2e`: Playwright end-to-end tests.

## Git rules

- Commit step by step: one logical change per commit, Conventional Commits with the step id, for example `feat(UI.3): add Mantis foundation`. Fixes and patches follow the same rules.
- Never commit secrets (`.env`, keys, tokens).
- No calendar dates in any plan or document.
- Keep frontend and backend changes in their own repos.
- Never force-push or rewrite history. Fix forward or `git revert`.
- Do not break live Railway deployments. The build must pass before merging to `main`.
- Work on feature branches and merge by pull request. Before every push: `git ls-files | sort -f | uniq -di` must print nothing (CI is Linux, file names are case sensitive).
- Tick a step in `docs/TASKS.md` only after it is verified.

## Design rule

The UI is Mantis-based MUI. Use the shared theme and the shared components. No ad-hoc styles, no raw colors, and no new UI libraries. New screens are composed from existing Mantis patterns; new components are added to the shared library first.

- Template first: copy from `reference/mantis/vite/` (local, gitignored, Mantis Free only) as it is, then change content. Brand colours live ONLY in `src/themes/`.
- Vendored template files stay JS/JSX (`src/themes`, `src/layout`, `src/components/@extended`, and so on); our own code is TypeScript.
- Tailwind and `src/components/ui` are legacy and exist only until the last UI run removes them. Do not use them in new code.

See `docs/DESIGN-SYSTEM.md`, `NOTICE` and Part UI in `docs/TASKS.md`. Rules for scope, quality and honesty are in `docs/TASKS.md` section 0 and `docs/SKILLS.md`.
