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

Phase A (setup). No application code yet. The stack is React with TypeScript and Vite (TASKS section 2.4).

## Local setup (so far)

1. Set the git identity locally (TASKS 1.2).
2. Install the pre-commit hooks (secret blocking and file checks, step T.3), see `SKILLS.md` Appendix A:

   ```
   pre-commit install --allow-missing-config
   pre-commit run --all-files
   ```

3. Copy `.env.example` to `.env.local` and fill in local values. Real `.env` files are git-ignored. Never put a secret in a `VITE_*` variable: it ends up in the browser bundle.

The single check command (`npm run check`, step T.24) is added in a later step.
