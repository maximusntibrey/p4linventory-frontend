# Inventory & Warehouse System: Task List

> **Document set.** [README](docs/project/README.md) · [1 Overview and Sprints](docs/project/1-Overview-and-Sprints.md) · [2 Frontend](docs/project/2-Frontend-Requirements.md) · [3 Backend](docs/project/3-Backend-Requirements.md) · [4 DevOps](docs/project/4-DevOps-Requirements.md) · [TASKS](TASKS.md) · [SKILLS](SKILLS.md) · [Gaps and actions](docs/project/PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](docs/project/5-Detailed-Requirements.md), [6 Functional Workflow Specification](docs/project/6-Functional-Workflow-Specification.md).

## Overview

Source of truth for scope: the three requirements documents: [1-Overview-and-Sprints.md](docs/project/1-Overview-and-Sprints.md), [3-Backend-Requirements.md](docs/project/3-Backend-Requirements.md) and [2-Frontend-Requirements.md](docs/project/2-Frontend-Requirements.md). DevOps steps come from [4-DevOps-Requirements.md](docs/project/4-DevOps-Requirements.md) (proposed, awaiting owner approval). If this file and those documents disagree, the documents win. Stop and ask the owner before changing scope.

## Structure

- 9 sprints of 5 working days (45 days)
- Phase 1 = Sprints 1 to 5 (MVP released at end of Sprint 2, day 10)
- Phase 2 = Sprints 6 to 9
- Release tags: `sprint-1-demo` (Sprint 1, on `develop`), then `v1.0.0`, `v1.1.0`, `v1.2.0`, `v1.3.0` (Phase 1 complete), `v2.1.0`, `v2.2.0`, `v2.3.0`, `v2.4.0` (Phase 2 complete). See DevOps section 4.
- No calendar dates are attached to this plan. Work is tracked by sprint and day number only. Do not add dates.
- Stack: Django (backend, repo `eqp4l-backend`) and React (frontend, repo `p4linventory-frontend`).

## Important Deferrals

The following are NOT scheduled and should NOT be built (full list in the Deferrals section below and in Backend section 14):
- Barcode, label, scanning, per-piece records, serial numbers, POS integration, bundles, stocktake, repair tracking, email/SMS notifications, offline mode

## Sprint Structure

Step codes: `G` = git step, `T` = tooling step, `O` = DevOps step, `B<day>.<n>` = backend step, `F<day>.<n>` = frontend step.

Tick a box only when the step is done, tested, reviewed and pushed to git.

## 0. Enforced Rules

### 0.1 Orientation (do this before every piece of work)

1. Read this file, the requirements documents, and `SKILLS.md` in the repo you are working in.
2. Confirm which repo you are in: run `git remote -v` and `pwd`. Backend work happens only in the backend repo, frontend work only in the frontend repo. Never edit one repo while in the other.
3. Confirm the git identity (section 1.2) and the current branch: run `git config user.name`, `git config user.email`, `git branch --show-current`. Fix them before doing anything else.
4. Run `git pull` on the current branch, then pick the next unticked step in order. Do not skip ahead.
5. Always be present at the end of a step: after finishing, re-run the checks in 0.3, commit, push and tick. Never leave work uncommitted or unpushed when a session ends.

### 0.2 Scope rules

- Build only what the requirements documents describe, in the sprint they are scheduled. Deferred items (section 14 of [3-Backend-Requirements.md](docs/project/3-Backend-Requirements.md)) stay out.
- Never invent business rules. If a rule is missing or unclear, add a note under "Open questions" at the bottom of this file and ask the owner.
- The frontend never decides a business rule. It shows what the API allows and reports what the API rejects. No business logic is duplicated in the frontend.
- The backend never depends on how screens look.
- The OpenAPI contract is the only link between the two repos. Change it only by: propose, agree with the owner, update the contract file, then adjust both sides. Breaking changes only at a sprint boundary.

### 0.3 Quality rules (a step is not done until all pass)

- Code works and the step's tests exist and pass. Run the repo's single check command (lint, type check, tests) and it must be green.
- Every stock change goes through the one stock service (atomic, row-locked, with a ledger entry). Never edit balances directly.
- The audit trail and the stock ledger are append-only. Never write code that edits or deletes them.
- Permissions are enforced on the server for every protected action (role, active branch, approved access).
- Secrets never go in code or in git. Use environment variables. `.env` files are git-ignored.
- Cost price is visible only to SuperAdmin and Warehouse Admin. Cross-branch lookup shows branch name and quantity only.
- Timestamps are timezone-aware and shown in Africa/Accra time (storing in UTC is proposed, see `SKILLS.md`). Currency is GHS.
- Frontend: 360 px width with no sideways scroll, tap targets at least 44 px, every icon has a text label, status never shown by colour alone, keyboard navigation works.
- Do not mark a step done on partial work. If blocked, leave it unticked and note the blocker under "Open questions".

### 0.4 Honesty and safety rules

- Never claim a test passed, a command ran, or a deployment succeeded unless it did. Report real output.
- Never use destructive commands (`git push --force`, `git reset --hard` on shared branches, dropping databases, deleting files) without the owner's explicit approval.
- Production deployment (Day 10) and any production data change need the owner's go-ahead first.
- Do not install a package or skill that has not been vetted (section 2.1). Record every install in `SKILLS.md`.
- Keep this file current: tick completed steps in the same commit as the work.

### 0.5 Fixes, patches and updates (these follow ALL the rules above, especially the git rules)

A fix, patch, dependency update, config change or "quick tweak" is real work. It gets no shortcut. Section 1.7 gives the exact git procedure.

- Never edit directly on `main`, `develop` or a sprint branch. Every change, however small, goes on its own branch and merges by pull request.
- Every fix is tied to a reference: a step code, or a logged issue (`FIX-<n>`) recorded under "Fix log" at the bottom of this file. No untracked changes.
- A bug fix must include a test that fails before the fix and passes after it. If a test is genuinely impossible, record why in the pull request.
- The full check command must be green before the pull request is opened and again before it merges.
- Fixes touching stock, ledger, permissions, audit, money or migrations need extra care: re-run the permission and branch-isolation tests and the concurrency tests, and never edit an existing migration that has been applied. Add a new migration instead.
- Dependency updates: one dependency (or one tightly related group) per branch, pinned, with the lockfile updated, the security scan re-run, and `SKILLS.md` updated.
- A change that alters the OpenAPI contract follows the contract rule in 0.2 and is never mixed with an unrelated fix.
- Urgent production problems use the `hotfix/` procedure in 1.7. Urgency is not a reason to skip tests, review or the backup in 0.6.
- Never rewrite published history to hide a mistake. Fix forward with a new commit, or revert with `git revert`.

### 0.6 DevOps rules

- Environments are `local`, `staging` and `production`. Code reaches production only through `main`, by tag, after passing staging.
- Staging mirrors production (same database engine, same settings apart from secrets and domains). Never test migrations first on production.
- Take a verified backup before every production deployment and every production migration. Record it in the deployment log.
- Every deployment has a written rollback step that has been tried on staging. If the rollback is not known to work, do not deploy.
- Secrets live only in the hosting platform's secret store or environment variables. They are never in git, logs, screenshots or chat.
- Deploy only with the owner's go-ahead for production. Report real deployment output. Never claim a deploy worked without running the smoke tests (section 3).
- Infrastructure and deployment configuration live in git in the repo they belong to, and change by pull request like code.

### 0.7 Development gate

- No application code is written until the owner authorises development. Record the authorisation (who, when, which sprint) under "Open questions" below and in `PROJECT_GAPS_AND_ACTIONS.md`.
- Before authorising, the owner answers the critical gaps (GAP-C01 to GAP-C08) in `PROJECT_GAPS_AND_ACTIONS.md`, or states which can wait and until when.
- Gate confirmed by the owner on 2026-11-18. All critical gaps (GAP-C01 to GAP-C08) were answered the same day. Current status: **authorised by the owner on 2026-11-18, starting with Sprint 1.** Rule 0.1 still applies before every piece of work, and section 2 (T.0: package installs must work) comes before any code.

## 1. Git Workflow (Two Separate Repositories)

### 1.1 Repositories

| Part | Repository | Owner |
|---|---|---|
| Backend | `eqp4l-backend` | maximusntibrey |
| Frontend | `p4linventory-frontend` | maximusntibrey |

The backend repository name `eqp4l-backend` is confirmed by the owner. Do not create or rename repos without approval.

### 1.2 Identity (set locally in each repo, never globally)

```
git config user.name  "maximusntibrey"
git config user.email "maximuslambertntibrey.mln@gmail.com"
```

Check it at the start of every session (rule 0.1). Commits made under any other identity must be fixed before pushing.

### 1.3 Branch model (same in both repos)

- `main`: production-ready code only. Tagged for each release. Protected: no direct commits, no force pushes.
- `develop`: integration branch. Deployed to staging. All sprint work merges here.
- `sprint/<n>-<slug>`: one per sprint, branched from `develop`.
- `feature/<step-code>-<slug>`: one per step or small group of steps, branched from the sprint branch.
- `fix/<slug>`: bug fixes. `hotfix/<slug>`: urgent production fixes, branched from `main`.

### 1.4 Commit and pull request rules

- One commit per completed step, or smaller. Format: `<type>(<step-code>): <what changed>` where type is `feat`, `fix`, `test`, `docs`, `chore` or `refactor`.
- Commit often, push at least at the end of every step. No giant end-of-day commits.
- Each feature branch is merged into its sprint branch by pull request, only after the check command is green. Tick the step's box in `TASKS.md` in the same PR.
- At sprint end the sprint branch is merged into `develop` (staging check), then `develop` into `main` and tagged (release sprints only).
- Delete merged feature branches. Never commit secrets, `.env`, build output, or large binaries.

### 1.5 Per-sprint git routine

Start of sprint:
1. `git checkout develop && git pull`
2. `git checkout -b sprint/<n>-<slug>` and `git push -u origin sprint/<n>-<slug>`

Every step:
3. `git checkout -b feature/<code>-<slug>` from the sprint branch
4. Do the work, run the check command, commit, push, open a pull request into the sprint branch, merge, tick the box

End of sprint:
5. Pull the latest `develop` into the sprint branch, fix conflicts, run the full check command
6. Pull request: sprint branch into `develop`, then run the staging integration check (frontend against real backend)
7. Release sprints only: pull request `develop` into `main`, tag it, push the tag, write release notes
8. Update docs and `SKILLS.md`, tick the sprint's git steps, push

### 1.6 Initial git setup

- [ ] G.1 Backend repo `eqp4l-backend`: clone, set identity (1.2), create `main` and `develop`, protect `main`
- [ ] G.2 Frontend repo `p4linventory-frontend`: clone, set identity (1.2), create `main` and `develop`, protect `main`
- [x] G.3 Add `.gitignore`, `.env.example`, `README.md`, `SKILLS.md` and a copy of this `TASKS.md` to both repos
- [ ] G.4 Add a pull request template with the quality checklist from rule 0.3 to both repos
- [ ] G.5 Add CI to both repos that runs the check command on every pull request (done again in B1.8 and F1.2; tick here when the repos are connected)
- [ ] G.6 Branch protection on `main` and `develop` in both repos: pull request required, CI green required, no force pushes, no direct commits

### 1.7 Git procedure for fixes, patches and updates

Normal fix (not urgent, found during a sprint or on staging):
1. Log it under "Fix log" with a `FIX-<n>` reference. 2. `git checkout <sprint branch or develop> && git pull`. 3. `git checkout -b fix/<fix-ref>-<slug>`. 4. Write the failing test, make the fix, run the check command. 5. Commit as `fix(FIX-<n>): <what changed>`, push, open a pull request. 6. Merge only when CI is green, then delete the branch. 7. Tick or update the Fix log entry in the same pull request.

Dependency or config update:
1. `git checkout develop && git pull`. 2. `git checkout -b chore/<slug>`. 3. Update one dependency or group, update the lockfile, run the check command and the security scan. 4. Commit as `chore(<ref>): <what changed>`, update `SKILLS.md`, push, pull request, merge when green.

Hotfix (production is broken or unsafe):
1. Tell the owner and get the go-ahead. 2. Take a verified backup (rule 0.6). 3. `git checkout main && git pull`, then `git checkout -b hotfix/<fix-ref>-<slug>`. 4. Failing test, fix, full check command. 5. Pull request into `main`, merge when green, tag a patch version, deploy, run the smoke tests. 6. Merge the same fix back into `develop` and into the open sprint branch by pull request so it is not lost. 7. Record it in the Fix log and the deployment log.

After any merge: confirm the other repo is not affected. If the OpenAPI contract changed, create the matching task in the other repo before closing the fix.

Commit message ending: when an AI assistant makes a commit or pull request, keep the author identity from 1.2 and follow any attribution lines the owner has asked for.

## 2. SKILLS, TOOLS AND PACKAGES TO INSTALL (Day 1, before any code)

### 2.1 Install procedure for every item

1. Check whether it is already installed. 2. Vet it: official source, maintained, licence acceptable, no known security issues. 3. Install a pinned version. 4. Verify it works (run version command or a smoke test). 5. Record name, version, purpose and date in `SKILLS.md` in the right repo. 6. Commit `SKILLS.md` and lockfiles.

Package installs need network access to the package registries (PyPI, npm, GitHub). In the Claude workspace this is controlled by the account's network settings, which an AI cannot change. If installs are refused, stop, tell the owner, and do not fake the install. Step T.0 below makes sure installs work before Sprint 1 starts.

### 2.2 Shared

- [x] T.0 Confirm package installs work in the working environment: run a test install of one Python package (`pip install`) and one npm package. If refused, the owner updates the network settings to allow package registries, opens a new chat or session (an existing one may not pick up the change), and the test is repeated. Do not continue until it passes.
- [ ] T.1 Git, GitHub CLI (`gh`) and authentication as maximusntibrey
- [ ] T.2 Claude skills available to the AI: `docx`, `pdf`, `xlsx` (user guides, exports, report checks), `frontend-design` (UI work), `file-reading` and `pdf-reading` (reading the requirements PDFs), `skill-creator` (only if a project skill is needed)
- [ ] T.3 Editor config (`.editorconfig`), pre-commit hooks to run lint and block secrets
- [x] T.4 Create `SKILLS.md` in both repos and record every install

### 2.3 Backend (Python, Django, API, database)

- [ ] T.5 Python 3.12+, `venv`, `pip`/`pip-tools` (pinned requirements)
- [ ] T.6 Django and Django REST Framework (custom user model, session login)
- [ ] T.7 `drf-spectacular` (generates the OpenAPI contract)
- [ ] T.8 PostgreSQL (and `psycopg`), plus `django-environ` (env config)
- [ ] T.9 Password hashing (Argon2 via `argon2-cffi`), `django-ratelimit` or DRF throttling
- [ ] T.10 `django-cors-headers`, `django-filter`, `Pillow` (image validation and optimisation)
- [ ] T.11 `pytest`, `pytest-django`, `factory-boy`, `pytest-cov` (permissions, isolation, concurrency tests)
- [ ] T.12 `ruff` (lint and format), `mypy` or `django-stubs`, `bandit` and `pip-audit` (security checks)
- [ ] T.13 Gunicorn and WhiteNoise (or the chosen host's equivalent), Sentry SDK (error monitoring)
- [ ] T.14 Backup tooling: `pg_dump` and a scripted restore test
- [ ] T.15 One check command (e.g. `make check`) that runs lint, type check, security scan and tests

### 2.4 Frontend (React, mobile-first UI)

- [ ] T.16 Node.js LTS and `npm` (or `pnpm`), pinned in `.nvmrc`
- [ ] T.17 React with TypeScript and Vite
- [ ] T.18 React Router, TanStack Query (data fetching), `react-hook-form` with `zod` (forms and inline validation)
- [ ] T.19 Tailwind CSS (or the chosen CSS approach) with the design tokens from Frontend section 2; Lucide icons (`lucide-react`)
- [ ] T.20 `openapi-typescript` and a typed API client generated from the backend contract
- [ ] T.21 MSW (Mock Service Worker) for mock responses in CI and early development
- [ ] T.22 Vitest, React Testing Library, Playwright (end-to-end smoke tests), `axe-core` / `vitest-axe` (accessibility checks)
- [ ] T.23 ESLint and Prettier, `eslint-plugin-jsx-a11y`, `npm audit`
- [ ] T.24 One check command (e.g. `npm run check`) that runs lint, type check, unit tests and build

## 3. DEVOPS PLAN

DevOps covers hosting, environments, CI/CD, database operations, backups, monitoring, security and releases for both repos. The requirements say the project has no established setup, so time is reserved for it in every sprint (the `O` steps inside each sprint). All DevOps work follows rules 0.5 and 0.6 and the git procedure in 1.7.

### 3.1 Environments

| Environment | Purpose | Deployed from | Who approves |
|---|---|---|---|
| local | Developer machine, Docker Compose (Django, PostgreSQL) and Vite dev server | any branch | none |
| staging | Integration check: frontend against real backend, end-to-end tests, migration rehearsal | `develop`, automatically on merge | none |
| production | Real users and real data | `main`, by version tag only | owner's go-ahead for every release |

### 3.2 Target architecture

- Backend: Django served by Gunicorn behind the host's HTTPS reverse proxy. PostgreSQL as a managed database.
- Frontend: React production build served as static files (static host or CDN) over HTTPS.
- Product images and uploaded documents: object storage (not the server disk), included in backups.
- Scheduled jobs (overdue transfer reminders, backups): run by the host's scheduler or cron calling Django management commands.
- Health: a `/health/` endpoint on the backend that checks the app and the database.

### 3.3 CI/CD pipeline

Every pull request runs the check command in CI and must be green before merge. Pipeline details (what each CI run checks, staging and production deploys) are in DevOps section 5.

### 3.4 Smoke tests

1. `/health/` responds OK. 2. Log in as the SuperAdmin. 3. Open the dashboard and the item list. 4. Stock screen loads. 5. A read-only Find search returns results. 6. HTTPS, CORS and secure cookie settings are correct. 7. No new errors in monitoring after 15 minutes.

### 3.5 Backups and recovery

- Automated daily database backups plus object-storage backups, with a stated retention period.
- A restore test is done on staging before the MVP release, after any major migration, and at each phase end.
- A verified backup is taken immediately before every production deployment and logged.

## PHASE 1

## SPRINT 1 (Days 1 to 5): MVP part 1. Goal: setup, login, users and branches, items and stock, warehouse flow. No release; demo only.

Branches: `sprint/1-foundations` in both repos. Tag at end: `sprint-1-demo` (on `develop`, no release to `main`).

### Git steps for Sprint 1

- [ ] S1.G1 Backend: create `sprint/1-foundations` from `develop`, push
- [ ] S1.G2 Frontend: create `sprint/1-foundations` from `develop`, push
- [ ] S1.G3 Backend: all Sprint 1 steps merged by pull request into the sprint branch, one commit per step
- [ ] S1.G4 Frontend: all Sprint 1 steps merged by pull request into the sprint branch, one commit per step
- [ ] S1.G5 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S1.G6 Both repos: tag `sprint-1-demo`, docs and `SKILLS.md` updated, everything pushed

### Sprint 1 standards

- [ ] S1.S1 Tests added for every new feature; security check on new features; backup check; docs updated; 10 to 20% of time kept free for bugs

### Backend, Sprint 1

- [ ] B1.0 Tooling setup and verification (section 2.2 and 2.3), recorded in `SKILLS.md`
- [ ] B1.1 Scope and permission table for owner approval (4 roles: SuperAdmin, Warehouse Admin, Branch Admin, Front Staff; per-person permissions: Receive stock, Manage prices, discount; branch rules; self-approval rules; shortfall resolution by admin roles only)
- [ ] B1.2 Data model: users, roles, branches, items, stock balances, stock movements, dispatches, sales (ERD written and approved by the owner before any migration, see `SKILLS.md` Database Standards; stock buckets and movements per Specification section 11.2; ledger rows carry a stable source reference and line ID so per-unit tracking can be added later, no unit tables now)
- [ ] B1.3 Endpoint list as the API contract (OpenAPI), published first for the frontend
- [ ] B1.4 Short requirements digest in the repo
- [ ] B1.8 Repo, environments, CI and the one check command
- [ ] B2.1 Schema and migrations (accounts, roles, branches, inventory, stock, ledger, audit)
- [ ] B2.2 User model and ID generator (`SA-0001` for SuperAdmins, `USR-0001` for others; never changed, never reused)
- [ ] B2.3 Login, logout, password hashing, secure sessions, rate limit and login log
- [ ] B2.4 Permission checks by role and branch (only SuperAdmins can assign multiple roles)
- [ ] B2.5 Seed data: `SA-0001`, 3 branches, sample items with stock
- [ ] B2.6 Tests: IDs, login, permissions
- [ ] B3.1 Working-branch selection and switching endpoints (every switch logged; requests scoped to the chosen branch)
- [ ] B3.2 Branch management API (create, edit, deactivate)
- [ ] B3.3 User management API (auto ID, role, branch, deactivate, reset password, grant per-person permissions such as Receive stock)
- [ ] B3.4 Dashboard shell data
- [ ] B3.5 Tests: branch scoping and access
- [ ] B4.1 Item API: common fields, key specs, draft or active, with item field definitions per category
- [ ] B4.2 One image upload (type and size enforced)
- [ ] B4.3 Stock balances and the movement log: one service for every stock change, atomic with row locks and idempotency keys
- [ ] B4.4 Stock query API
- [ ] B4.5 Tests: validation rules, no negative stock, atomic stock service
- [ ] B5.1 Warehouse receipt API (supplier name, items, quantities, cost; atomic with ledger; duplicate submissions blocked)
- [ ] B5.2 Dispatch API (Warehouse Admin only; validates available stock; quantities go in transit)
- [ ] B5.3 Branch receiving API (quantity per line, approve all, partial or reject; shortfall flagged)
- [ ] B5.4 Queries for what is waiting at each branch
- [ ] B5.5 Tests: receipt atomicity, dispatch permissions, partial receiving
- [ ] B5.6 Sprint 1 review, fixes and publish the updated OpenAPI contract

### Frontend, Sprint 1

- [ ] F1.0 Tooling setup and verification (section 2.2 and 2.4), recorded in `SKILLS.md`
- [ ] F1.1 UI kit: colours (white, grey, one accent; green/amber/red for status only), spacing, one icon set, buttons, cards, form fields, status badges, top bar, navigation
- [ ] F1.2 Repo, environments, CI and the one check command
- [ ] F1.3 App shell
- [ ] F1.4 API client generated from the contract, with mock responses
- [ ] F2.1 Login screen (user ID, password, clear errors, too-many-attempts message)
- [ ] F2.2 Layout, route guards and menu per role (built from what the API allows, max 5 items per role; Super Admin: Home, Items, Warehouse, Branches, Users, with Activity, Sell, Find and Receive opened from Home)
- [ ] F2.3 Tests: login and route guards
- [ ] F3.1 Working-branch selection and switching (top bar shows branch, ID, switch icon with label, logout)
- [ ] F3.2 Branch management screens
- [ ] F3.3 User management screens (show the generated ID after creation; deactivate and reset password with confirm step; per-person permissions such as Receive stock)
- [ ] F3.4 Dashboard shell
- [ ] F4.1 Item list (search, filters, pagination, status badges, cards on phones; cost shown only if the API returns it)
- [ ] F4.2 Item add and edit (category-driven form from field definitions, inline validation, save as Draft, activate, duplicate warning)
- [ ] F4.3 One image upload with clear type and size messages
- [ ] F4.4 Stock screen (by location, low-stock flag, search)
- [ ] F4.5 Tests: item form and validation
- [ ] F5.1 Receive stock into the warehouse screen (supplier, item lines, review, confirm, receipt reference shown)
- [ ] F5.2 Dispatch screen (branch, lines with available quantity, status list)
- [ ] F5.3 Branch receiving screen (waiting list, quantity pre-filled, "Received all" shortcut, shortfall note and highlight)
- [ ] F5.4 Screens for what is waiting at each branch
- [ ] F5.5 Tests: receiving flow
- [ ] F5.6 Sprint 1 review, 360 px check and fixes

### DevOps, Sprint 1

- [ ] O1.1 Owner chooses the hosting provider, database host, object storage and domain names (record in `RUNBOOK.md` and remove from Open questions)
- [ ] O1.2 Local environment: Dockerfile and Docker Compose for the backend and PostgreSQL; `.env.example` for both repos
- [ ] O1.3 Backend CI pipeline (3.3) with a PostgreSQL service
- [ ] O1.4 Frontend CI pipeline (3.3)
- [ ] O1.5 Staging environment created for backend and frontend, secrets stored in the host's secret store
- [ ] O1.6 Automatic deploy of `develop` to staging, followed by the smoke tests (3.4)
- [ ] O1.7 `/health/` endpoint and Sentry connected on staging
- [ ] O1.8 Branch protection and secret scanning confirmed in both repos (G.6)

## SPRINT 2 (Days 6 to 10): MVP part 2. Goal: sales, find, CSV import, dashboard and activity log, testing, hardening, deployment. Release: MVP (day 10).

Branches: `sprint/2-mvp-release` in both repos. Tag at end: `v1.0.0` (MVP) on `main` in both repos.

### Git steps for Sprint 2

- [ ] S2.G1 Backend: create `sprint/2-mvp-release` from `develop`, push
- [ ] S2.G2 Frontend: create `sprint/2-mvp-release` from `develop`, push
- [ ] S2.G3 Backend: all Sprint 2 steps merged by pull request, one commit per step
- [ ] S2.G4 Frontend: all Sprint 2 steps merged by pull request, one commit per step
- [ ] S2.G5 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S2.G6 Owner go-ahead received, then `develop` merged into `main` in both repos
- [ ] S2.G7 Tag `v1.0.0` (MVP) in both repos, release notes written, pushed
- [ ] S2.G8 Docs and `SKILLS.md` updated, everything pushed

- [ ] S2.S1 Sprint standards (tests, security check, backup check, docs, 10 to 20% buffer)

### Backend, Sprint 2

- [ ] B6.1 Sale API (price from the item, payment method, stock deducted, overselling blocked; sale, deduction, ledger and audit atomic)
- [ ] B6.2 Sales list per branch
- [ ] B6.3 Find and search API including other branches' quantities (branch name and quantity only)
- [ ] B6.4 CSV import API (items and opening quantity per location, dry run, error report with row numbers, opening balances written as ledger movements)
- [ ] B6.5 Cancel sale API (SuperAdmin and Branch Admin, reason required, reversal entry linked to the original; status becomes Cancelled)
- [ ] B6.6 Tests: sale atomicity, overselling, cancel reversal, import
- [ ] B7.1 Dashboard endpoints (stock per branch, in transit, low stock, scoped to role and branch)
- [ ] B7.2 Activity log endpoints (filter by user, branch, action, date)
- [ ] B7.3 Basic discrepancy resolution for dispatch shortfalls: return to sender, confirm loss, record damage; mandatory note; through the stock service with ledger and audit entries; any admin role (Super Admin, Warehouse Admin, Branch Admin) within its allowed branches; front staff refused
- [ ] B7.4 Tests: each resolution path, balances and ledger after resolution, permission refusals
- [ ] B8.1 End-to-end tests (receive, dispatch, branch receive, sell, find)
- [ ] B8.2 Permission and branch-isolation tests (allowing the cross-branch lookup exception)
- [ ] B8.3 Bug fixes from testing
- [ ] B9.1 Performance check (search and product list within about 2 seconds)
- [ ] B9.2 Security check of the MVP endpoints
- [ ] B9.3 Automated backups and a tested restore
- [ ] B9.4 Fixes from the checks
- [ ] B10.1 Production deployment (after the owner's go-ahead)
- [ ] B10.2 Load real data and create real users
- [ ] B10.3 Short admin notes
- [ ] B10.4 MVP release (v1.0.0)

### Frontend, Sprint 2

- [ ] F6.1 Sell screen (search, quantities, running list and total, payment method, confirm in about 3 steps, clear message when quantity exceeds stock)
- [ ] F6.2 Sales list and cancel action (reason asked, confirm step, cancelled badge)
- [ ] F6.3 Find screen (stock at my branch plus other branches by name and quantity only)
- [ ] F6.4 CSV import screen (upload, preview, error report with row numbers, confirm)
- [ ] F6.5 Tests: sell flow
- [ ] F7.1 Dashboards (a few big numbers and a short recent-activity list, no charts)
- [ ] F7.2 Activity log screen (filter by user, branch, action, date), opened from Home for Super Admin
- [ ] F7.3 Shortfall list and resolve screen (return to sender, confirm loss, record damage; note required; confirm step)
- [ ] F8.1 Component tests (item form, lists and filters, sell flow, receiving flow)
- [ ] F8.2 End-to-end smoke test against staging (login, pick branch, add item, receive, dispatch, receive at branch, sell, find)
- [ ] F8.3 Bug fixes from testing
- [ ] F9.1 UI consistency pass
- [ ] F9.2 Accessibility check (360 px, 44 px targets, labels on every icon, keyboard-only flows)
- [ ] F9.3 List performance check and fixes
- [ ] F10.1 Short user guide and walkthrough (use the `docx` or `pdf` skill)
- [ ] F10.2 Checks on the live frontend
- [ ] F10.3 MVP release (v1.0.0)

### DevOps, Sprint 2

- [ ] O2.1 Production environment created (managed PostgreSQL, object storage, HTTPS, domains, CORS and CSRF settings, secure cookies)
- [ ] O2.2 Automated daily backups for the database and the image storage
- [ ] O2.3 Restore test on staging, result recorded in the deployment log
- [ ] O2.4 Rollback rehearsed on staging, written into `RUNBOOK.md`
- [ ] O2.5 Monitoring and uptime checks on production
- [ ] O2.6 Owner go-ahead, verified backup, then production deployment of `v1.0.0` with smoke tests (matches B10.1)
- [ ] O2.7 Deployment log entry written for `v1.0.0`

## SPRINT 3 (Days 11 to 15): Fixes from real use, laptop, parts and accessory specifications, warranty terms, product and variant split, several images and spec sheets. Release: `v1.1.0`.

Branches: `sprint/3-specifications` in both repos. Tag at end: `v1.1.0` on `main` in both repos.

### Git steps for Sprint 3

- [ ] S3.G1 Backend: create `sprint/3-specifications` from `develop`, push
- [ ] S3.G2 Frontend: create `sprint/3-specifications` from `develop`, push
- [ ] S3.G3 Both repos: all Sprint 3 steps merged by pull request, one commit per step
- [ ] S3.G4 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S3.G5 Owner go-ahead, verified backup, `develop` merged into `main`, tag `v1.1.0`, release notes, docs and `SKILLS.md` updated, pushed

- [ ] S3.S1 Sprint standards (tests, security check, backup check, docs, 10 to 20% buffer)

### Backend, Sprint 3

- [ ] B11.1 Fixes from real use (data, performance)
- [ ] B11.2 Scheduled daily backups confirmed (matches O3.1)
- [ ] B12.1 Typed laptop specification fields (Backend 3.3) with validation and filter columns
- [ ] B12.2 Laptop filters: processor, RAM, storage, screen size, operating system
- [ ] B13.1 Part specifications (Backend 3.4), common and type-specific fields
- [ ] B13.2 Compatibility catalogue (many-to-many to laptop brand, series, model; replaced part numbers)
- [ ] B13.3 "Parts for laptop model X" search
- [ ] B14.1 Accessory specifications (Backend 3.5) and filters
- [ ] B14.2 Warranty terms on items (type, months) and warranty end date calculated on each sale line
- [ ] B14.3 Tests: field definitions per category, validation, filters, warranty end date
- [ ] B15.1 Split items into product and variant, with data migration (rehearsed on staging first, O3.2)
- [ ] B15.2 Several images per product with a primary image; spec-sheet attachments (type and size enforced, hidden not deleted once there is history)
- [ ] B15.3 Tests: migration keeps balances, ledger and history intact; image and document rules
- [ ] B15.4 Sprint 3 review, publish the updated OpenAPI contract, release `v1.1.0`

### Frontend, Sprint 3

- [ ] F11.1 Fixes from real MVP use and UI polish from feedback
- [ ] F12.1 Laptop specification form sections and laptop filters
- [ ] F13.1 Part specification forms, compatibility picker, "parts for laptop model X" search
- [ ] F14.1 Accessory forms and filters
- [ ] F14.2 Warranty terms on the item form; warranty end date on the sale and in the sales list
- [ ] F15.1 Product and variant screens
- [ ] F15.2 Several images with a primary image, and spec-sheet upload
- [ ] F15.3 Tests: category-driven forms for all three categories, warranty terms, images; 360 px check
- [ ] F15.4 Release `v1.1.0`

### DevOps, Sprint 3

- [ ] O3.1 Scheduled backups confirmed
- [ ] O3.2 Product and variant migration rehearsed on staging with rollback tested
- [ ] O3.3 Verified backup, deploy, smoke tests, deployment log entry

## SPRINT 4 (Days 16 to 20): Branch-to-branch transfers, stock adjustments and reversals, notifications. Release: `v1.2.0`.

Branches: `sprint/4-transfers` in both repos. Tag at end: `v1.2.0` on `main` in both repos.

### Git steps for Sprint 4

- [ ] S4.G1 Backend: create `sprint/4-transfers` from `develop`, push
- [ ] S4.G2 Frontend: create `sprint/4-transfers` from `develop`, push
- [ ] S4.G3 Both repos: all Sprint 4 steps merged by pull request, one commit per step
- [ ] S4.G4 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S4.G5 Owner go-ahead, verified backup, `develop` merged into `main`, tag `v1.2.0`, release notes, docs and `SKILLS.md` updated, pushed

- [ ] S4.S1 Sprint standards (tests, security check, backup check, docs, 10 to 20% buffer)

### Backend, Sprint 4

- [ ] B16.1 Branch-to-branch transfer API: create with reason, validate and reserve, in transit (Branch Admin)
- [ ] B17.1 Transfer receiving: quantity per line, approve all, partial or reject; sender cannot approve
- [ ] B17.2 Extend the Sprint 2 discrepancy resolution (B7.3) to branch-to-branch transfers, plus other authorised dispositions
- [ ] B17.3 Tests: transfer permissions, partial receipt, discrepancy resolution, in-transit stock not sellable
- [ ] B18.1 Stock adjustments (damaged, expired, count variance, found stock, entry correction, restockable return) with mandatory reason and approval
- [ ] B18.2 Reversals as linked compensating movements; self-approval rule (Super Admin flagged)
- [ ] B18.3 Tests: adjustments, reversals, approval rules
- [ ] B19.1 Notifications (incoming stock, shortfalls, low stock, pending approvals) and their API
- [ ] B19.2 Overdue-transfer reminder job (configurable, suggested 48 hours), run by the O4.1 scheduler
- [ ] B20.1 Buffer, regression, publish the updated OpenAPI contract, release `v1.2.0`

### Frontend, Sprint 4

- [ ] F16.1 Branch transfer screen: send
- [ ] F17.1 Branch transfer screen: receive, with shortfalls and discrepancy resolution
- [ ] F18.1 Stock adjustment and reversal screens with approval
- [ ] F19.1 Notification centre and badge (bell icon with a text label)
- [ ] F20.1 Buffer, regression and release `v1.2.0`

### DevOps, Sprint 4

- [ ] O4.1 Scheduler for the overdue transfer reminder on staging and production
- [ ] O4.2 Concurrency tests at staging data volume
- [ ] O4.3 Verified backup, deploy, smoke tests, deployment log entry

## SPRINT 5 (Days 21 to 25): Branch access requests, multi-role assignment, price history, activity screens, security review and hardening. Release: `v1.3.0` (Phase 1 complete).

Branches: `sprint/5-phase1-complete` in both repos. Tag at end: `v1.3.0` on `main` in both repos.

### Git steps for Sprint 5

- [ ] S5.G1 Backend: create `sprint/5-phase1-complete` from `develop`, push
- [ ] S5.G2 Frontend: create `sprint/5-phase1-complete` from `develop`, push
- [ ] S5.G3 Both repos: all Sprint 5 steps merged by pull request, one commit per step
- [ ] S5.G4 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S5.G5 Owner go-ahead, verified backup, `develop` merged into `main`, tag `v1.3.0`, release notes, docs and `SKILLS.md` updated, pushed

- [ ] S5.S1 Sprint standards (tests, security check, backup check, docs, 10 to 20% buffer)

### Backend, Sprint 5

- [ ] B21.1 Branch access requests and approvals (reason, destination Branch Admin or Super Admin, expiry or revoke, switch log)
- [ ] B22.1 Multi-role assignment by Super Admin, and a permissions review
- [ ] B22.2 Role switching: the selected role's permissions and dashboard only; each switch logged
- [ ] B23.1 Price history, the "Manage prices" permission, and the below-cost warning
- [ ] B24.1 User activity (track record) and stock movement history endpoints
- [ ] B25.1 Security review, performance check, tests, documentation and buffer
- [ ] B25.2 Phase 1 acceptance criteria checked (Backend section 13), release `v1.3.0`

### Frontend, Sprint 5

- [ ] F21.1 Branch access request and approval screens
- [ ] F22.1 Role assignment screen
- [ ] F22.2 Role switcher in the top bar; switching changes the whole view (menu, home dashboard, screens) to the selected role
- [ ] F23.1 Price history, manage prices, and below-cost warning display
- [ ] F24.1 User activity and stock movement history screens
- [ ] F25.1 Accessibility review, UI test pass, documentation
- [ ] F25.2 Phase 1 acceptance criteria checked (Frontend section 10), release `v1.3.0`

### DevOps, Sprint 5

- [ ] O5.1 Infrastructure security review
- [ ] O5.2 Restore test repeated
- [ ] O5.3 Performance check (search and product list within about 2 seconds)
- [ ] O5.4 Verified backup, deploy, smoke tests, deployment log entry

## PHASE 2

## SPRINT 6 (Days 26 to 30): Selling, part 1: price lists, branch overrides, discounts, receipts, customer details. Release: `v2.1.0`.

Branches: `sprint/6-selling-1` in both repos. Tag at end: `v2.1.0` on `main` in both repos.

### Git steps for Sprint 6

- [ ] S6.G1 Backend: create `sprint/6-selling-1` from `develop`, push
- [ ] S6.G2 Frontend: create `sprint/6-selling-1` from `develop`, push
- [ ] S6.G3 Both repos: all Sprint 6 steps merged by pull request, one commit per step
- [ ] S6.G4 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S6.G5 Owner go-ahead, verified backup, `develop` merged into `main`, tag `v2.1.0`, release notes, docs and `SKILLS.md` updated, pushed

- [ ] S6.S1 Sprint standards (tests, security check, backup check, docs, 10 to 20% buffer)

### Backend, Sprint 6

- [ ] B26.1 Price lists
- [ ] B27.1 Branch price override
- [ ] B28.1 Discounts with permission, mandatory reason and recorded limit
- [ ] B29.1 Receipt data (reference, branch, staff, items, prices, total, payment method, time, warranty end date where applicable). Tax display waits for the accountant's answer
- [ ] B30.1 Customer details (required for warranty-bearing items)
- [ ] B30.2 Tests and release `v2.1.0`

### Frontend, Sprint 6

- [ ] F26.1 Price list screens
- [ ] F27.1 Branch price override screens
- [ ] F28.1 Discount entry in the sell screen
- [ ] F29.1 Receipt view (print and share)
- [ ] F30.1 Customer details in the sell screen
- [ ] F30.2 Tests and release `v2.1.0`

### DevOps, Sprint 6

- [ ] O6.1 Receipt print and share checked on real phones and a printer
- [ ] O6.2 Verified backup, deploy, smoke tests, deployment log entry

## SPRINT 7 (Days 31 to 35): Selling, part 2: split payments, daily close, returns and refunds, sales history, role dashboards, hardening. Release: `v2.2.0`.

Branches: `sprint/7-selling-2` in both repos. Tag at end: `v2.2.0` on `main` in both repos.

### Git steps for Sprint 7

- [ ] S7.G1 Backend: create `sprint/7-selling-2` from `develop`, push
- [ ] S7.G2 Frontend: create `sprint/7-selling-2` from `develop`, push
- [ ] S7.G3 Both repos: all Sprint 7 steps merged by pull request, one commit per step
- [ ] S7.G4 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S7.G5 Owner go-ahead, verified backup, `develop` merged into `main`, tag `v2.2.0`, release notes, docs and `SKILLS.md` updated, pushed

- [ ] S7.S1 Sprint standards (tests, security check, backup check, docs, 10 to 20% buffer)

### Backend, Sprint 7

- [ ] B31.1 Split payments across methods
- [ ] B32.1 Daily close (cash-up), variances logged
- [ ] B33.1 Returns and refunds through reversals
- [ ] B34.1 Sales history filters (branch, staff, date, item, payment method) and role dashboard data
- [ ] B35.1 Hardening and release `v2.2.0`

### Frontend, Sprint 7

- [ ] F31.1 Split payment entry
- [ ] F32.1 Daily close screen
- [ ] F33.1 Returns and refunds screens
- [ ] F34.1 Sales history filters and role dashboards
- [ ] F35.1 Polish and release `v2.2.0`

### DevOps, Sprint 7

- [ ] O7.1 Concurrency and load check for simultaneous sales
- [ ] O7.2 Verified backup, deploy, smoke tests, deployment log entry

## SPRINT 8 (Days 36 to 40): Reports and exports. Release: `v2.3.0`.

Branches: `sprint/8-reports` in both repos. Tag at end: `v2.3.0` on `main` in both repos.

### Git steps for Sprint 8

- [ ] S8.G1 Backend: create `sprint/8-reports` from `develop`, push
- [ ] S8.G2 Frontend: create `sprint/8-reports` from `develop`, push
- [ ] S8.G3 Both repos: all Sprint 8 steps merged by pull request, one commit per step
- [ ] S8.G4 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S8.G5 Owner go-ahead, verified backup, `develop` merged into `main`, tag `v2.3.0`, release notes, docs and `SKILLS.md` updated, pushed

- [ ] S8.S1 Sprint standards (tests, security check, backup check, docs, 10 to 20% buffer)

### Backend, Sprint 8

- [ ] B36.1 Sales reports (by period, branch, staff, product, payment method)
- [ ] B37.1 Stock balance, low stock and ageing reports
- [ ] B38.1 Receipt, supplier, transfer and shortfall reports
- [ ] B39.1 Adjustment and reversal history, stock valuation and margin (authorised roles only)
- [ ] B40.1 Audited CSV exports (products, stock balances, ledger history) and release `v2.3.0`

### Frontend, Sprint 8

- [ ] F36.1 Sales reports
- [ ] F37.1 Stock reports
- [ ] F38.1 Receipt, supplier, transfer and shortfall reports
- [ ] F39.1 Adjustment and reversal history, stock valuation and margin
- [ ] F40.1 Export buttons and release `v2.3.0`

### DevOps, Sprint 8

- [ ] O8.1 Report and CSV export run times and timeouts checked
- [ ] O8.2 Verified backup, deploy, smoke tests, deployment log entry

## SPRINT 9 (Days 41 to 45): Website API, inspection and grading per receipt line, supplier records, hardening. Release: `v2.4.0` (Phase 2 complete).

Branches: `sprint/9-phase2-complete` in both repos. Tag at end: `v2.4.0` on `main` in both repos.

### Git steps for Sprint 9

- [ ] S9.G1 Backend: create `sprint/9-phase2-complete` from `develop`, push
- [ ] S9.G2 Frontend: create `sprint/9-phase2-complete` from `develop`, push
- [ ] S9.G3 Both repos: all Sprint 9 steps merged by pull request, one commit per step
- [ ] S9.G4 Both repos: sprint branch merged into `develop`, staging integration check passed
- [ ] S9.G5 Owner go-ahead, verified backup, `develop` merged into `main`, tag `v2.4.0`, release notes, docs and `SKILLS.md` updated, pushed

- [ ] S9.S1 Sprint standards (tests, security check, backup check, docs, 10 to 20% buffer)

### Backend, Sprint 9

- [ ] B41.1 Read-only website API: search and product detail
- [ ] B42.1 Availability by branch, API keys (stored hashed) and rate limits; no cost, customer or sales data exposed
- [ ] B43.1 Inspection and grading per receipt line (grade, test results, condition notes, photos)
- [ ] B44.1 Supplier records (name, contacts, terms, invoice and delivery note attachments)
- [ ] B45.1 Security review, buffer, Phase 2 acceptance criteria checked (Backend section 13), release `v2.4.0`

### Frontend, Sprint 9

- [ ] F41.1 API key management screen
- [ ] F42.1 Inspection and grading on the receiving screen
- [ ] F44.1 Supplier screens
- [ ] F45.1 Polish, final review, Phase 2 acceptance criteria checked (Frontend section 10), release `v2.4.0`

### DevOps, Sprint 9

- [ ] O9.1 Website API exposure checks (key storage, rate limits, CORS, no costs or customer data)
- [ ] O9.2 Final restore test with recovery time
- [ ] O9.3 Runbook reviewed
- [ ] O9.4 Owner go-ahead, verified backup, deploy, smoke tests, deployment log entry
- [ ] O9.5 Infrastructure notes for POS integration (a later update, not scheduled)

## DEFERRALS

- Barcodes and Code 128 labels, scanning, per-piece records and serial numbers, manufacturer barcode field and barcode/serial search, per-piece warranty and repair tracking, POS integration (tills, receipt printers, scanners), label printer and scanner hardware, bundles, stocktake workflow, email and SMS notifications, offline mode, lead capture and AI agent integration (not scheduled; can start after the website API in Sprint 9).

## OPEN QUESTIONS

Add a line here whenever a rule is missing, unclear or contradicted (rule 0.2). Critical and high gaps are tracked in [PROJECT_GAPS_AND_ACTIONS.md](docs/project/PROJECT_GAPS_AND_ACTIONS.md).

| Ref | Question | Raised by | Answer | Answered by |
|---|---|---|---|---|
| OQ-1 | Development gate (rule 0.7): has the owner authorised development? | Doc sync 2026-11-18 | Yes, from Sprint 1 | Owner, 2026-11-18 |
| OQ-2 | Hosting provider, database host, object storage and domain names (O1.1) | DevOps doc | Open | |
| OQ-3 | Backup and log retention periods | DevOps doc | Open | |
| OQ-6 | T.3 blocker (frontend): the pre-commit hooks block secrets and lint files (whitespace, line endings, YAML/JSON, merge markers, keys), but there is no JavaScript/TypeScript linter yet. ESLint and Prettier arrive at T.23; their hook is added then and T.3 is ticked in this repo | devops, Phase A | Blocked on T.23 | |

## FIX LOG

| Ref | What was wrong or changed | Repo | Branch | Test added | Merged | Released in |
|---|---|---|---|---|---|---|
| FIX-1 | (first entry goes here) | | | | | |

## DEPLOYMENT LOG

| Version | Environment | Backup verified | Migrations run | Smoke tests passed | Rollback ready | Approved by owner |
|---|---|---|---|---|---|---|
| (first entry goes here) | | | | | | |
