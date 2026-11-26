# AGENTS.md

Payless4Laptops inventory and warehouse system, frontend only: React 19, TypeScript, Vite, Tailwind 4, TanStack Query, MSW mocks from `contract/openapi.yaml`. The backend lives in its own repo; the OpenAPI contract is the only link.

## Commands

- `npm install`, then `npm run dev` (Vite with the `/api` proxy; mock mode runs without the backend).
- `npm run check`: lint, format check, types, contract drift, design-token check, tests, audit, build, dist verification. Must be green before any PR and before merging to `main`.
- `npm run e2e`: Playwright end-to-end tests.

## Git rules

- Commit step by step: one logical change per commit, Conventional Commits with the step id, for example `feat(DS.2): add design tokens`. Fixes and patches follow the same rules.
- Never commit secrets (`.env`, keys, tokens).
- No calendar dates in any plan or document.
- Keep frontend and backend changes in their own repos.
- Never force-push or rewrite history. Fix forward or `git revert`.
- Do not break live Railway deployments. The build must pass before merging to `main`.
- Work on feature branches and merge by pull request.
- Tick a step in `docs/TASKS.md` only after it is verified.

## Design rule

All UI must use the design-system tokens and components. No ad-hoc styles. Any new component is added to the library first.

See `docs/DESIGN-SYSTEM.md` and the `/design-system` showcase route. Rules for scope, quality and honesty are in `docs/TASKS.md` section 0 and `docs/SKILLS.md`.
