# Inventory & Warehouse System: Task List

> **Document set.** [README](README.md) Â· [1 Overview and Sprints](1-Overview-and-Sprints.md) Â· [2 Frontend](2-Frontend-Requirements.md) Â· [3 Backend](3-Backend-Requirements.md) Â· [4 DevOps](4-DevOps-Requirements.md) Â· [TASKS](TASKS.md) Â· [SKILLS](SKILLS.md) Â· [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).

## Overview

Source of truth for scope: the three requirements documents: [1-Overview-and-Sprints.md](1-Overview-and-Sprints.md), [3-Backend-Requirements.md](3-Backend-Requirements.md) and [2-Frontend-Requirements.md](2-Frontend-Requirements.md). DevOps steps come from [4-DevOps-Requirements.md](4-DevOps-Requirements.md) (proposed, awaiting owner approval). If this file and those documents disagree, the documents win. Stop and ask the owner before changing scope.

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
2. Confirm which repo you are in: run `git remote -v` and `pwd`. Backend work happens only in the backend repo, frontend work only in the frontend repo. Never edit one repo while in the other. _(Applied in the end-of-day cycle (owner))_
3. Confirm the git identity (section 1.2) and the current branch: run `git config user.name`, `git config user.email`, `git branch --show-current`. Fix them before doing anything else. _(Applied in the end-of-day cycle (owner))_
4. Run `git pull` on the current branch, then pick the next unticked step in order. Do not skip ahead.
5. Always be present at the end of a step: after finishing, re-run the checks in 0.3, commit, push and tick. Never leave work uncommitted or unpushed when a session ends.

### 0.2 Scope rules

- Build only what the requirements documents describe, in the sprint they are scheduled. Deferred items (section 14 of [3-Backend-Requirements.md](3-Backend-Requirements.md)) stay out.
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
- Design rule (frontend): All UI must use the design-system tokens and components. No ad-hoc styles. Any new component is added to the library first.

### 0.4 Honesty and safety rules

- Never claim a test passed, a command ran, or a deployment succeeded unless it did. Report real output.
- Never use destructive commands (`git push --force`, `git reset --hard` on shared branches, dropping databases, deleting files) without the owner's explicit approval.
- Production deployment (Day 10) and any production data change need the owner's go-ahead first.
- Do not install a package or skill that has not been vetted (section 2.1). Record every install in `SKILLS.md`.
- Keep this file current: tick completed steps in the same commit as the work.

### 0.5 Fixes, patches and updates (these follow ALL the rules above, especially the git rules)

A fix, patch, dependency update, config change or "quick tweak" is real work. It gets no shortcut. Section 1.7 gives the exact git procedure.

- Never edit directly on `main`, `develop` or a sprint branch. Every change, however small, goes on its own branch and merges by pull request. _(Applied in the end-of-day cycle (owner))_
- Every fix is tied to a reference: a step code, or a logged issue (`FIX-<n>`) recorded under "Fix log" at the bottom of this file. No untracked changes.
- A bug fix must include a test that fails before the fix and passes after it. If a test is genuinely impossible, record why in the pull request.
- The full check command must be green before the pull request is opened and again before it merges.
- Fixes touching stock, ledger, permissions, audit, money or migrations need extra care: re-run the permission and branch-isolation tests and the concurrency tests, and never edit an existing migration that has been applied. Add a new migration instead. _(git parts: applied in the end-of-day cycle (owner))_
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
- Gate confirmed by the owner. All critical gaps (GAP-C01 to GAP-C08) were answered the same day. Current status: **authorised by the owner, starting with Sprint 1.** Rule 0.1 still applies before every piece of work, and section 2 (T.0: package installs must work) comes before any code.

## 1. Git Workflow (Two Separate Repositories) _(Applied in the end-of-day cycle (owner))_

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

### 1.6 Initial git setup _(Applied in the end-of-day cycle (owner))_

- [x] G.1 Backend repo `eqp4l-backend`: clone, set identity (1.2), create `main` and `develop`, protect `main`
- [x] G.2 Frontend repo `p4linventory-frontend`: clone, set identity (1.2), create `main` and `develop`, protect `main`
- [x] G.3 Add `.gitignore`, `.env.example`, `README.md`, `SKILLS.md` and a copy of this `TASKS.md` to both repos
- [x] G.4 Add a pull request template with the quality checklist from rule 0.3 to both repos
- [x] G.5 Add CI to both repos that runs the check command on every pull request (done again in B1.8 and F1.2; tick here when the repos are connected)
- [x] G.6 Branch protection on `main` and `develop` in both repos: pull request required, CI green required, no force pushes, no direct commits

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
- [x] T.1 Git, GitHub CLI (`gh`) and authentication as maximusntibrey
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

- [x] T.16 Node.js LTS and `npm` (or `pnpm`), pinned in `.nvmrc`
- [x] T.17 React with TypeScript and Vite
- [x] T.18 React Router, TanStack Query (data fetching), `react-hook-form` with `zod` (forms and inline validation)
- [x] T.19 Tailwind CSS (or the chosen CSS approach) with the design tokens from Frontend section 2; Lucide icons (`lucide-react`)
- [x] T.20 `openapi-typescript` and a typed API client generated from the backend contract
- [x] T.21 MSW (Mock Service Worker) for mock responses in CI and early development
- [x] T.22 Vitest, React Testing Library, Playwright (end-to-end smoke tests), `axe-core` / `vitest-axe` (accessibility checks)
- [x] T.23 ESLint and Prettier, `eslint-plugin-jsx-a11y`, `npm audit`
- [x] T.24 One check command (e.g. `npm run check`) that runs lint, type check, unit tests and build

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

### Git steps for Sprint 1 _(Applied in the end-of-day cycle (owner))_

- [x] S1.G1 Backend: create `sprint/1-foundations` from `develop`, push
- [x] S1.G2 Frontend: create `sprint/1-foundations` from `develop`, push
- [x] S1.G3 Backend: all Sprint 1 steps merged by pull request into the sprint branch, one commit per step — per-step commits on the sprint branch, merged by PR #1 (owner decision: git runs at end of day)
- [x] S1.G4 Frontend: all Sprint 1 steps merged by pull request into the sprint branch, one commit per step — as S1.G3, frontend PR #1 merged
- [x] S1.G5 Both repos: sprint branch merged into `develop`, staging integration check passed — PR #1 merged into `develop` in both repos; staging smoke passes
- [x] S1.G6 Both repos: tag `sprint-1-demo`, docs and `SKILLS.md` updated, everything pushed — tag `sprint-1-demo` exists in both repos

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

- [x] F1.0 Tooling setup and verification (section 2.2 and 2.4), recorded in `SKILLS.md`
- [x] F1.1 UI kit: colours (white, grey, one accent; green/amber/red for status only), spacing, one icon set, buttons, cards, form fields, status badges, top bar, navigation
- [x] F1.2 Repo, environments, CI and the one check command (CI green on first push (run 45241768590); re-tick after the first green CI run)
- [x] F1.3 App shell
- [x] F1.4 API client generated from the contract, with mock responses
- [x] F2.1 Login screen (user ID, password, clear errors, too-many-attempts message)
- [x] F2.2 Layout, route guards and menu per role (built from what the API allows, max 5 items per role; Super Admin: Home, Items, Warehouse, Branches, Users, with Activity, Sell, Find and Receive opened from Home)
- [x] F2.3 Tests: login and route guards
- [x] F3.1 Working-branch selection and switching (top bar shows branch, ID, switch icon with label, logout)
- [x] F3.2 Branch management screens
- [x] F3.3 User management screens (show the generated ID after creation; deactivate and reset password with confirm step; per-person permissions such as Receive stock)
- [x] F3.4 Dashboard shell
- [x] F4.1 Item list (search, filters, pagination, status badges, cards on phones; cost shown only if the API returns it)
- [x] F4.2 Item add and edit (category-driven form from field definitions, inline validation, save as Draft, activate, duplicate warning)
- [x] F4.3 One image upload with clear type and size messages
- [x] F4.4 Stock screen (by location, low-stock flag, search)
- [x] F4.5 Tests: item form and validation
- [x] F5.1 Receive stock into the warehouse screen (supplier, item lines, review, confirm, receipt reference shown)
- [x] F5.2 Dispatch screen (branch, lines with available quantity, status list)
- [x] F5.3 Branch receiving screen (waiting list, quantity pre-filled, "Received all" shortcut, shortfall note and highlight)
- [x] F5.4 Screens for what is waiting at each branch
- [x] F5.5 Tests: receiving flow
- [x] F5.6 Sprint 1 review, 360 px check and fixes

### DevOps, Sprint 1

- [x] O1.1 Owner decision recorded: Railway project `test-production`, existing PostgreSQL service `Postgres`, Django `FileSystemStorage` on a Railway Volume intended at `/data`, and generated backend/frontend domains; see `docs/RAILWAY.md`. Verify the volume mount in the dashboard before release.
- [x] O1.2 Local environment: Dockerfile and Docker Compose for the backend and PostgreSQL; `.env.example` for both repos
- [x] O1.3 Backend CI pipeline (3.3) with a PostgreSQL service — verified backend `.github/workflows/ci.yml`; manual run 45771645404 passed.
- [x] O1.4 Frontend CI pipeline (3.3) — verified `.github/workflows/ci.yml`; manual run 45771644995 passed.
- [x] O1.5 Staging-equivalent environment created locally for backend and frontend, secrets excluded from git; real host secret store is a production deployment gate
- [x] O1.6 Automatic deploy of `develop` to staging, followed by the smoke tests (3.4) — Railway `staging` deploys `develop`; staging smoke (login, password change, dashboard, items, stock, branches, activity log, sales) passes
- [ ] O1.7 `/health/` endpoint and Sentry connected on staging — `/health/` ok on staging and production; Sentry not connected until the owner supplies `SENTRY_DSN`
- [x] O1.8 Branch protection and secret scanning confirmed in both repos (G.6) — branch protection (PR, `check`, admins enforced, no force push) and secret scanning with push protection verified via API on `main` and `develop` in both repos

## SPRINT 2 (Days 6 to 10): MVP part 2. Goal: sales, find, CSV import, dashboard and activity log, testing, hardening, deployment. Release: MVP (day 10).

Branches: `sprint/2-mvp-release` in both repos. Tag at end: `v1.0.0` (MVP) on `main` in both repos.

### Git steps for Sprint 2 _(Applied in the end-of-day cycle (owner))_

- [x] S2.G1 Backend: create `sprint/2-mvp-release` from `develop`, push — branch `sprint/2-mvp-release` created and pushed
- [x] S2.G2 Frontend: create `sprint/2-mvp-release` from `develop`, push — branch `sprint/2-mvp-release` created and pushed
- [x] S2.G3 Backend: all Sprint 2 steps merged by pull request, one commit per step — per-step commits, merged by PR #2 into `develop` (CI green)
- [x] S2.G4 Frontend: all Sprint 2 steps merged by pull request, one commit per step — as S2.G3, frontend PR #2 merged (CI green)
- [x] S2.G5 Both repos: sprint branch merged into `develop`, staging integration check passed — PR #2 merged into `develop` in both repos; staging smoke passes
- [x] S2.G6 Owner go-ahead received, then `develop` merged into `main` in both repos — `develop` merged into `main` by PR (backend #6, frontend #4); `main` is deployed on Railway
- [x] S2.G7 Tag `v1.0.0` (MVP) in both repos, release notes written, pushed — tag `v1.0.0` and release notes in both repos
- [x] S2.G8 Docs and `SKILLS.md` updated, everything pushed — docs, deployment log, Railway notes and TASKS updated; calendar dates removed from plan docs

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
- [x] B9.1 Performance check (search and product list within about 2 seconds) — backend verified in `tests/test_b9.py`
- [x] B9.2 Security check of the MVP endpoints — backend contract and permission suites verified
- [ ] B9.3 Automated backups and a tested restore — local backup and restore verified; no automated hosted backup
- [x] B9.4 Fixes from the checks — no backend fix required
- [ ] B10.1 Production release — the `main` branch now holds the Sprint 1 and 2 code and Railway deployed it (backend `/health/` returns database ok). Still open: first Super Admin, real data, and a verified backup before real data is loaded.
- [ ] B10.2 Load real data and create real users — needs the owner: real data and real users
- [ ] B10.3 Short admin notes
- [ ] B10.4 MVP release (v1.0.0)

### Frontend, Sprint 2

- [x] F6.1 Sell screen (search, quantities, running list and total, payment method, confirm in about 3 steps, clear message when quantity exceeds stock)
- [x] F6.2 Sales list and cancel action (reason asked, confirm step, cancelled badge)
- [x] F6.3 Find screen (stock at my branch plus other branches by name and quantity only)
- [x] F6.4 CSV import screen (upload, preview, error report with row numbers, confirm)
- [x] F6.5 Tests: sell flow
- [x] F7.1 Dashboards (a few big numbers and a short recent-activity list, no charts)
- [x] F7.2 Activity log screen (filter by user, branch, action, date), opened from Home for Super Admin
- [x] F7.3 Shortfall list and resolve screen (return to sender, confirm loss, record damage; note required; confirm step)
- [x] F8.1 Component tests (item form, lists and filters, sell flow, receiving flow)
- [x] F8.2 Staging-equivalent smoke test — health/login/dashboard/items and 60 Playwright flows pass locally; external hosted staging remains blocked
- [x] F8.3 Bug fixes from testing
- [x] F9.1 UI consistency pass — verified by `e2e/f9.spec.ts` and existing 360 px Playwright coverage
- [x] F9.2 Accessibility check (360 px, 44 px targets, labels on every icon, keyboard-only flows) — verified by `e2e/f9.spec.ts`, component axe tests and Playwright 360 px suites
- [x] F9.3 List performance check and fixes — verified `e2e/f9.spec.ts`; no fix was required
- [x] F10.1 Short user guide and walkthrough (use the `docx` or `pdf` skill) — `docs/USER_GUIDE.md` and `docs/USER_GUIDE.docx`
- [x] F10.2 Checks on the live frontend — live frontend serves, its bundle targets the production API, and a browser login attempt reaches the API (401 for a wrong password, no CORS or CSRF error); authenticated walkthrough is the first owner login
- [x] F10.3 MVP release (v1.0.0) — MVP release `v1.0.0` tagged; backup gate waived by the owner

### DevOps, Sprint 2

- [x] O2.1 Railway services, domains, source branch `main` for both services, production variables and the `/data` volume are verified with the Railway CLI. Backend `DJANGO_ALLOWED_HOSTS` includes `healthcheck.railway.app`; `PORT=8080`.
- [ ] O2.2 Automated daily backups for PostgreSQL and the image volume — local backup scripts verified; no automated hosted backup (Railway Trial limit)
- [ ] O2.3 Restore test on hosted staging — local restore test verified; hosted restore not run (no DB dump access)
- [x] O2.4 Rollback rehearsed on hosted staging — rehearsed on hosted staging: previous commit deployed healthy, latest redeployed healthy, each switch under a minute
- [x] O2.5 Monitoring and uptime checks on production — `.github/workflows/uptime.yml` pings production backend `/health/` and frontend `/login` every 15 minutes (the same commands pass now; first scheduled run pending on `main`)
- [x] O2.6 Owner go-ahead received. Fresh deploy from `main` succeeded (backend deployment 069a98a7, frontend 3d338b46). Still open: verified database-and-image backup on Railway before real data, and a v1.0.0 smoke-test sign-off. — production release from `main` done: migrations applied, first Super Admin created, static files built into the image, cookie fix for cross-site login; backup gate waived by the owner; production sign-in is the first owner login
- [x] O2.7 Deployment log entry written for `v1.0.0` — entry written in the backend `docs/DEPLOYMENT_LOG.md`

## SPRINT 3 (Days 11 to 15): Fixes from real use, laptop, parts and accessory specifications, warranty terms, product and variant split, several images and spec sheets. Release: `v1.1.0`.

Branches: `sprint/3-specifications` in both repos. Tag at end: `v1.1.0` on `main` in both repos.

### Git steps for Sprint 3 _(Applied in the end-of-day cycle (owner))_

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

### Git steps for Sprint 4 _(Applied in the end-of-day cycle (owner))_

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

### Git steps for Sprint 5 _(Applied in the end-of-day cycle (owner))_

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

### Git steps for Sprint 6 _(Applied in the end-of-day cycle (owner))_

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

### Git steps for Sprint 7 _(Applied in the end-of-day cycle (owner))_

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

### Git steps for Sprint 8 _(Applied in the end-of-day cycle (owner))_

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

### Git steps for Sprint 9 _(Applied in the end-of-day cycle (owner))_

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

## DESIGN SYSTEM (frontend, cross-sprint)

Rule: all UI uses the design-system tokens and components; no ad-hoc styles; new components go to the library first (see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) and `AGENTS.md`).

- [x] DS.1 Design tokens: `src/styles/tokens.css`, AA contrast verified numerically in `src/styles/tokens.test.ts`
- [x] DS.2 Component library in `src/components/ui/` (component, vitest-axe and keyboard tests); placeholder logo (real logo file not available)
- [x] DS.3 Enforcement: `npm run design:check` in `npm run check`, baseline `scripts/design-token-baseline.json` (0 violations), script tests
- [x] DS.4 Living showcase `/design-system` (lazy; dev, or Super Admin via the server's `all_branches`), `docs/DESIGN-SYSTEM.md`, 360 px e2e
- [ ] DS.5 Migrate pages to the library, route by route (table below); the baseline must stay empty
- [ ] DS.6 Replace the legacy `components/*` (Field, Select, Nav, TopBar, Pager, StatusBadge, Card, AppShell) with the library and delete them
- [ ] DS.7 Replace the placeholder logo with the real file and adjust brand tokens

### Route migration

| Route | Screen | Status |
|---|---|---|
| `/login` | Login | not migrated |
| `/password-change` | ChangePassword (forced) | not migrated |
| `/` | Home | not migrated |
| `/account/password` | ChangePassword | not migrated |
| `/warehouse` | ComingSoon (Warehouse) | not migrated |
| `/activity` | ActivityPage | not migrated |
| `/shortfalls` | ShortfallsPage | not migrated |
| `/sell` | SellPage | not migrated |
| `/sell/sales` | SalesPage | not migrated |
| `/items/import` | ImportPage | not migrated |
| `/find` | FindPage | not migrated |
| `/goods-receipts` | GoodsReceiptPage | not migrated |
| `/dispatches` | DispatchesPage | not migrated |
| `/dispatches/new` | DispatchNew | not migrated |
| `/receive` | WaitingPage | not migrated |
| `/receive/:id` | ReceiveDispatch | not migrated |
| `/items` | ItemsPage | not migrated |
| `/items/new` | ItemNew | not migrated |
| `/items/:id` | ItemDetail | not migrated |
| `/stock` | StockPage | not migrated |
| `/branches` | BranchesPage | not migrated |
| `/users` | UsersPage | not migrated |
| `/users/new` | UserNew | not migrated |
| `/users/:id` | UserDetail | not migrated |
| `*` | NotFound | not migrated |
| `/design-system` | DesignSystem showcase | built on the library |

## DECISION LOG (working copy)

| Date | Decision | By |
|---|---|---|
| - | No git workflow DURING a day: no branches, PRs or worktrees while building. Git runs only in /sync, the END-OF-DAY CYCLE, /emergency-push, or when the owner says "push". TASKS 0.1 steps 2-3, the git parts of 0.5, section 1, the G and S*.G steps, and SKILLS rule 15 apply there. They are marked "Applied in the end-of-day cycle (owner)" and are not deleted. Everything else stays in force: scope, quality, testing, security, honesty, gates, stock/ledger/audit/permission rules, accessibility, and "done only with evidence". | Owner |
| - | B1.1 permission table (eqp4l-backend/docs/design/PERMISSION_TABLE.md) approved. | Owner |
| - | B1.2 ERD (eqp4l-backend/docs/design/ERD.md) approved, including new tables idempotency_keys and dispatch_resolutions. | Owner |
| - | OQ-4 to OQ-19: proposed answers approved as written. | Owner |
| - | Frontend supporting packages approved: @vitejs/plugin-react, @tailwindcss/vite, jsdom, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals, @types/react, @types/react-dom, @types/node. eslint 9.39.5 (deprecated) accepted until eslint-plugin-jsx-a11y supports ESLint 10. | Owner |
| - | GAP-M10 / OQ-3: keep local zip snapshots for the whole project; database backup retention decided when hosting (O1.1) is chosen. | Owner |
| - | FIX-4 approved: Idempotency-Key on every state-changing request (not only the 3 stock POSTs). Contract becomes v0.1.1. | Owner |
| - | FIX-5 approved: snake_case status codes in the database and API, mapped 1:1 to the SKILLS status words shown on screens; account status 'Pending activation' (pending_activation) added. Contract v0.1.1. | Owner |
| - | OQ-20 approved: Super Admin and Warehouse Admin can add, rename and deactivate brands (seeded list; endpoints in v0.1.1); image limit 5 MB, JPEG/PNG/WebP; Discontinued is final (no re-activation); dashboard shell fields as in the contract. | Owner |
| - | OQ-21 approved: an item can be activated without a selling price, but cannot be sold until a price exists; only Super Admin or a 'Manage prices' holder may send selling_price. | Owner |
| - | OQ-22 approved: an account created (or reset) by a Super Admin starts as pending_activation and becomes active after the user's first password change; pending_activation is set only by the system, never via the status endpoint. | Owner |
| - | Brands: a deactivated brand can be reactivated (SA or WA) and cannot be chosen for new items (400). | Owner |
| - | OQ-23 approved: add permission and menu codes for Sell, Activity, Find and Receive to the contract with B3.4 (dashboard shell), so Super Admin Home opens them from server data. | Owner |
| - | Contract v0.1.2 approved: a generic `conflict` error code (409) used for duplicate stock posts instead of idempotency_conflict, and the 429 response documented on /auth/password/. Publish at the start of Day 3; the frontend re-syncs. | Owner |
| - | Super Admin and branches: a Super Admin is never asked to pick a branch at login. Super Admin works across ALL branches: lists and dashboard default to all branches, with an optional branch filter to view one branch, and every action available to them can be performed on any branch (actions on a record use that record's location, OQ-12). /me exposes `must_pick_branch` (true only when the user's role requires a working branch and none is chosen; always false for Super Admin). | Owner |
| - | Contract v0.1.2 also approved: /me `home_links` (Sell, Activity, Find, Receive Home tiles, separate from the max-5 menu) and /me `can_assign_multiple_roles` (true only for Super Admin). | Owner |
| - | OQ-26 decided: (1) Deactivated is final (suspend for temporary cases). (2) Last-Super-Admin guard: the system must always keep at least one active Super Admin; removing the SA role from, suspending or deactivating the last active SA is refused. (3) A Branch Admin's user list includes users whose permanent branch is theirs AND Front Staff currently working at their branch. (4) Password reset is refused for a deactivated user. | Owner |
| - | OQ-25 (backend) decided: Warehouse Admin and Branch Admin open the Activity log from a Home tile (home_links), showing only their own location's activity (OQ-5). | Owner |
| - | FIX-34 kept: Sentry uses sentry-sdk 3.0.0 `data_collection` (user_info false, stack_frame_variables false, cookies off, http_bodies []) because include_local_variables/send_default_pii do not exist in 3.0.0. | Owner |
| - | Approved for the next contract version: /me `all_branches` (true when the user works across all branches, e.g. Super Admin), so the frontend stops inferring it. | Owner |
| - | OQ-2/O1.1: use Railway project `test-production`, the existing `Postgres` service, Django `FileSystemStorage` on a Railway Volume intended at `/data` (no object-storage bucket), and the generated backend/frontend domains. Volume configuration and verified backup availability remain release gates. | Owner |

## DEFERRALS

- Barcodes and Code 128 labels, scanning, per-piece records and serial numbers, manufacturer barcode field and barcode/serial search, per-piece warranty and repair tracking, POS integration (tills, receipt printers, scanners), label printer and scanner hardware, bundles, stocktake workflow, email and SMS notifications, offline mode, lead capture and AI agent integration (not scheduled; can start after the website API in Sprint 9).

## OPEN QUESTIONS

Add a line here whenever a rule is missing, unclear or contradicted (rule 0.2). Critical and high gaps are tracked in [PROJECT_GAPS_AND_ACTIONS.md](PROJECT_GAPS_AND_ACTIONS.md).

| Ref | Question | Raised by | Answer | Answered by |
|---|---|---|---|---|
| OQ-1 | Development gate (rule 0.7): has the owner authorised development? | Doc sync | Yes, from Sprint 1 | Owner |
| OQ-2 | Hosting provider, database host, storage and domain names (O1.1) | DevOps doc | Resolved: Railway `test-production`; existing `Postgres` service via `${{Postgres.DATABASE_URL}}`; Django `FileSystemStorage` on an intended `/data` Railway Volume; generated production domains. Verify the mount before release. | Owner |
| OQ-3 | Backup and log retention periods | DevOps doc | Decided (owner): local zips kept for whole project; DB retention set with hosting | |
| OQ-4 to OQ-19 | Proposed answers (question wording kept in the backend docs, not copied here) | Decision log | Answered: approved as written. | Owner |
| OQ-20 | Brands, image limits, Discontinued, dashboard shell | Decision log | Answered: Super Admin and Warehouse Admin can add, rename and deactivate brands (seeded list; endpoints in v0.1.1); image limit 5 MB, JPEG/PNG/WebP; Discontinued is final (no re-activation); dashboard shell fields as in the contract. | Owner |
| OQ-21 | Activating an item without a selling price | Decision log | Answered: an item can be activated without a selling price, but cannot be sold until a price exists; only Super Admin or a 'Manage prices' holder may send selling_price. | Owner |
| OQ-25 | Needs the owner on the v0.1.2 re-sync. (a) /me has no explicit "must pick a branch" flag: F3.1 treats working_branch null plus the working_branch.select permission as must pick, which also forces a Super Admin (whose context branch is optional) to pick one. Add a flag, or confirm. (b) Where will Home links for Activity, Sell, Find and Receive come from? F3.4 draws any /me menu entries beyond the 5 nav items as Home tiles. (c) Several roles per user: no API signal yet, so the user form offers one role; a user who already has several keeps them. (d) The dashboard has no cost field, so none is shown. | F3.1, F3.3, F3.4 | Answered by the decisions and contract v0.1.2: (a) /me `must_pick_branch` (never true for Super Admin, who works across all branches and may filter with `?branch=`); (b) /me `home_links`; (c) /me `can_assign_multiple_roles`; (d) no cost on the dashboard, unchanged. Built Day 3. | |
| OQ-23 | Sell and Activity have no code in the contract's `ActionPermission` list, and the Home links for Activity, Sell, Find and Receive (Super Admin) are not in `menu`. F2.2 guards `/sell` by the server menu and leaves Activity unrouted. Which permission codes will the API use, and where do the Home links come from (dashboard step)? | F2.2 | Approved (owner) | |
| FQ-1 | F4.4: the low-stock flag needs the reorder level (C13), but `StockBalance` has no `reorder_level` or low-stock field. The screen shows In stock / Out of stock from the quantities only. Recommend `reorder_level` (integer, nullable) and `low_stock` (boolean, set by the server) on StockBalance and StockBalanceWithCost. | F4.4 | Answered: owner approved; contract 0.3.0 adds `reorder_level` and `low_stock` on StockBalance. The stock screen uses `low_stock`. | |
| FQ-2 | F4.1: the Items list should filter by condition (FE section 4.3) but `/items/` and `/costed-items/` have no `condition` query parameter. The list filters by category, brand, status and search only. Recommend adding `condition` (new, refurbished, used). | F4.1 | Answered: owner approved; contract 0.3.0 adds the `condition` query. The list has a Condition filter. | |
| FQ-3 | F4.2 notes for the owner: (a) the item form has no selling price field (price list and Manage prices come later; ItemWrite already accepts it); (b) PATCH `key_specs` is sent as the full object: confirm the server replaces rather than merges, so a cleared spec is removed; (c) common-field definitions (`in_key_specs` false) are sent as top-level fields by their key, e.g. grade, description. | F4.2 | Answered: owner approved. (a) Selling price field added, shown only when /me lists `prices.manage` (otherwise never sent; no negatives). (b), (c) as built. | |
| FQ-4 | F5.3: the receiving screen sends qty_accepted equal to qty_received on every line, because FE section 4.8 shows one quantity per line (pre-filled with the quantity sent), Received all and a shortfall note. The contract also allows a line to accept less than it received (damage at the door). Also, the screen offers Reject delivery (decision reject with a reason) because the contract and workflow spec 5.2 define it, although FE 4.8 does not list it. Recommend: keep both as built for the MVP; per-line door rejection belongs to the Sprint 2 resolve screen. | F5.3 | Open: owner to confirm. | |
| FQ-5 | F5.4: the Warehouse Admin gets 403 on GET dispatches/waiting, so what is waiting at each branch is shown to the Warehouse Admin as the Dispatch list filtered by In transit and a branch (GET dispatches with status and destination_id). Branch Admin and Front Staff use the Receive list for their branch; the Super Admin has no working branch in /me, so the Receive screen asks for one and sends branch_id. Recommend: accept; no contract change. | F5.4 | Open: owner to confirm. | |
| FQ-6 | F5.1: unit_cost is required on every goods receipt line for every role that may receive stock, so the cost fields are always shown on that screen (the route needs goods_receipts.manage, held by Super Admin and Warehouse Admin, who may see cost). The screen shows no totals or average cost; those come only from costed endpoints. Recommend: accept; if a role without cost access ever gets Receive stock, the contract needs a rule for it. | F5.1 | Open: owner to confirm. | |
| FQ-7 | F6.1 BLOCKED: contract 0.3.2 has no sale endpoint (no create-sale call with lines, payment method and Idempotency-Key, no payment-method values, no insufficient-stock error code, no sale response with total). Nothing was built or mocked: inventing it would hide drift. Recommend: backend B6.1 publishes it (price from the item, payment method enum, 409 with a stable code and the line that is short, `sales.record` already exists), then owner runs contract:sync (0.4.0) and F6.1 is built. | F6.1 | Answered: contract 0.4.0 published sales; F6.1 built. Payment methods are the fixed codes cash, mobile_money, card (owner); customer name and phone are deferred to Sprint 3. |  |
| FQ-8 | F6.2 BLOCKED: contract has no sales list and no cancel call, no Sale status values (Completed / Cancelled), and no action permission for cancel (only `sales.record` exists). "Cancel only for SA/BA via /me" needs a code, e.g. `sales.cancel`. Recommend: B6.2 and B6.5 publish list, cancel (reason required) and `sales.cancel` in the same 0.4.0. | F6.2 | Answered: contract 0.4.0 publishes list and cancel; F6.2 built. Open point FQ-11 (no cancel permission code). |  |
| FQ-9 | F6.4 BLOCKED: contract has no CSV import endpoint (upload, dry-run, error report with row numbers, confirm), no column list and no permission code (SA and WA only). Recommend: B6.4 publishes it with an `imports.run` style permission; the frontend sends the file as multipart and shows the server's row errors without checking rows itself. | F6.4 | Answered: contract 0.4.0 publishes /item-imports/; F6.4 built. New items are created as Draft and a re-import adds stock again (owner); both are said before the confirm. |  |
| FQ-10 | F6.3 built on the existing `/stock/` and `/items/{id}/branch-availability/`. The screen lists items that have a stock row for the caller (Super Admin and Warehouse Admin get every location, because `/stock/` has no "my branch" for them). An item with no row at my branch is not listed, so cannot be found. Recommend: accept for the MVP, or add a cross-branch search by name/SKU to B6.3 (the backend step names a Find and search API that the contract does not carry yet). F6.5 (sell-flow tests) waits on FQ-7. | F6.3 | Answered: owner accepted as built. |  |
| FQ-11 | F6.2 and F6.4: `ActionPermission` has no code for cancelling a sale or for the CSV import, and `/me.menu` has no entry for either. So (a) the Cancel button is shown on every completed sale to anyone who can open the sales list, and the API answers 403 for Front Staff (shown as a message; the screen never checks a role); (b) the import screen opens with `items.manage` (held by Super Admin and Warehouse Admin) and is linked from the Items list; the sales list is linked from Sell. Recommend: add `sales.cancel` and `items.import` to `ActionPermission` and a Sales entry to `menu`, then the frontend switches the Cancel button and the import route to them. No menu entry was added (Super Admin already has 5). | F6.2, F6.4 | Answered: owner approved; contract 0.4.2 adds `sales.cancel` (SA, BA) and `items.import` (SA, WA), a Sales menu entry for Front Staff and a Sales home tile for SA and BA. The Cancel button, the import route and its link now follow those codes; the Sales entries are drawn from /me. |  |
| FQ-12 | Contract 0.4.1 adds Super Admin only `/costed-sales/` and `/costed-sales/{id}/` (unit_cost per line). Mock handlers exist (SA only, 403 for others, cost from the item's average cost). No screen uses them yet, so no cost is shown on any sales screen. Recommend: a later step adds a cost column to the sales list for users the API lets read it. | F6.2 | Open: owner to confirm | |
| FQ-13 | F7.1 PARTIAL: contract 0.4.2 `GET /dashboard/` (Dashboard) returns only waiting_dispatches, in_transit_dispatches, active_items and stock_per_location. It has no recent-activity list, so the short recent-activity part of F7.1 is not built (the big numbers per role already show on Home). Recommend: add `recent_activity` (array, max 10, of {id, occurred_at, summary, actor_name, branch_name}, filtered by the role's scope, no cost) to Dashboard in 0.5.0. | F7.1 | Answered: contract 0.5.0 (owner approved) publishes it; built and ticked on Sprint 2 Day 7 | |
| FQ-14 | F7.2 BLOCKED: contract 0.4.2 has no activity-log (audit event) list operation, no filter parameters (user, branch, action, date from/to), no action values and no permission code for opening it from Home (Super Admin only). Nothing built or mocked. Recommend: `GET /api/v1/activity-log/` (cursor or page, newest first) with query user_id, branch_id, action, date_from, date_to; item {id, occurred_at, actor, branch, action, summary}; permission code `activity_log.view` (Super Admin) plus the Home link in me.home_links; no cost or secrets in summaries. | F7.2 | Answered: contract 0.5.0 (owner approved) publishes it; built and ticked on Sprint 2 Day 7 | |
| FQ-15 | F7.3 BLOCKED: contract 0.4.2 has no shortfall (flagged discrepancy) list and no resolve operation: no list of open shortfalls (dispatch line, item, sender, destination, quantity, reason), no resolve call with resolution (return_to_sender / confirm_loss / record_damage), required note and Idempotency-Key, no status values, no error codes, no permission code. Nothing built or mocked. Recommend: `GET /api/v1/shortfalls/` (status filter open/resolved) and `POST /api/v1/shortfalls/{id}/resolve/` {resolution, note (required, non-empty)} with Idempotency-Key, 409 when already resolved, permission `shortfalls.resolve` (any admin role, decided C-rule), stock effects only on the server. | F7.3 | Answered: contract 0.5.0 (owner approved) publishes it; built and ticked on Sprint 2 Day 7 | |
| FQ-16 | F7.2/F7.3: which `home_links` /me gives per role, and the Activity User filter (shown only with `users.view`; no user list for WA and BA). | F7.2, F7.3 | Answered: contract 0.5.2 publishes /me home_links per role (SA Activity, Shortfalls, Sell, Find, Receive, Sales; WA Activity, Shortfalls; BA Activity, Shortfalls, Sales; FS none). The mock now matches (FIX-47). The User filter stays tied to `users.view`. | |
| DQ-1 | DS: the contract has no permission for the design-system showcase. It is gated by dev mode, or in production by the server flag `all_branches` (Super Admin). Should the backend add a dedicated permission? | Design system run | Open | |
| DQ-2 | DS: the real logo file and exact brand values were not available. Tokens and `src/assets/logo*.svg` are approximations. Supply the logo to replace them. | Design system run | Open | |
| DQ-3 | DS: the owner asked for the focus ring in #FF6B00; it is 2.9:1 on white (fails the 3:1 non-text rule), so the ring uses #EA580C. Confirm. Also: IconButton and the collapsed Sidebar show the text label as a tooltip on hover and focus, not always visible (rule: every icon has a visible text label). Confirm this is acceptable. | Design system run | Open | |

## FIX LOG

| Ref | What was wrong or changed | Repo | Branch | Test added | Merged | Released in |
|---|---|---|---|---|---|---|
| FIX-1 | High: production build fell back to mock mode and shipped the MSW worker. Mock only when VITE_API_MODE=mock and not PROD; worker script and MSW code kept out of dist (main.tsx dead-code guard, vite plugin, verify:dist in check). | frontend | n/a (no git during the day) | src/config/config.test.ts (PROD true or mode unset gives real); scripts/verify-dist.mjs in `npm run check` | no | not yet |
| FIX-2 | Appendix A (SKILLS.md) was empty: every package.json entry now registered with version, purpose, vetting note, owner approvals. | frontend | n/a (no git during the day) | n/a (docs) | no | not yet |
| FIX-3 | F1.2 unticked: CI green on first push (run 45241768590); re-tick after the first green CI run. | frontend | n/a (no git during the day) | n/a (docs) | no | not yet |
| FIX-4 | Contract drift detection added to check: regenerate types to a temp file and compare with src/api/schema.d.ts. | frontend | n/a (no git during the day) | src/api/contract-drift.test.ts; `npm run contract:drift` in check | no | not yet |
| FIX-5 | .gitattributes set to `* text=auto eol=lf`. | frontend | n/a (no git during the day) | n/a (config) | no | not yet |
| FIX-6 | Nav active item gets an indicator bar (not colour alone). | frontend | n/a (no git during the day) | src/components/components.test.tsx (Nav) | no | not yet |
| FIX-7 | Mock responses built from typed rows and whitelisted fields with `satisfies`; no request-body spreading. | frontend | n/a (no git during the day) | src/mocks/handlers.test.ts (unknown fields dropped) | no | not yet |
| FIX-8 | Mocks reject unsafe requests without X-CSRFToken with 403 csrf_failed. | frontend | n/a (no git during the day) | src/mocks/handlers.test.ts | no | not yet |
| FIX-9 | Branch Admin and Front Staff mock sessions (login USR-0001, USR-0002) omit average_cost on items and stock. | frontend | n/a (no git during the day) | src/mocks/handlers.test.ts | no | not yet |
| FIX-10 | Client retries once on 403 csrf_failed after a token refresh; concurrent first unsafe calls share one /auth/csrf/ fetch; non-object errors[] entries ignored. | frontend | n/a (no git during the day) | src/api/client.test.ts | no | not yet |
| FIX-11 | eslint no-restricted-syntax bans dangerouslySetInnerHTML. | frontend | n/a (no git during the day) | src/lint-rules.test.ts | no | not yet |
| FIX-12 | README and dev.ps1 use `npm ci`; documented `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1`; dev.ps1 exits when npm ci fails. | frontend | n/a (no git during the day) | n/a (docs, script) | no | not yet |
| FIX-13 | Switch branch and Log out disabled until F2 wires them. | frontend | n/a (no git during the day) | src/components/components.test.tsx (TopBar) | no | not yet |
| FIX-14 | Answered OQ-4..OQ-21 rows copied into Open questions (marked answered). | frontend | n/a (no git during the day) | n/a (docs) | no | not yet |
| FIX-15 | FE §5: a later 401 (not login/logout) sets me to null and the guard sends the user to /login with state {from, reason:'expired'}; Login shows "Your session has ended. Sign in again." One QueryClient factory with QueryCache/MutationCache onError (src/api/queryClient.ts), used by main.tsx and the test renderer. | frontend | n/a (no git during the day) | src/auth/auth.test.tsx (session ended later) | no | not yet |
| FIX-16 | RequireAuth shows the error state only when `isError && !me`; a failed /me refetch keeps the screen and typed input. | frontend | n/a (no git during the day) | src/auth/auth.test.tsx (failed /me refresh) | no | not yet |
| FIX-17 | Login and change-password mutations use gcTime 0 so passwords do not linger in the MutationCache. | frontend | n/a (no git during the day) | src/auth/auth.test.tsx (no password in mutation cache) | no | not yet |
| FIX-18 | e2e/stub.ts payloads typed with `satisfies` against components['schemas'] (User, Me, menu, Error). | frontend | n/a (no git during the day) | tsc over e2e; `npm run e2e` | no | not yet |
| FIX-19 | .github/workflows/ci.yml showed " M" with no diff: working file is LF, its hash equals the index and HEAD blob (a764031...), core.filemode false, no mode change. Only the stat cache is stale (file touched, content identical). Nothing to change; the next git index refresh clears it. | frontend | n/a (no git during the day) | n/a (investigation) | no | not yet |
| FIX-20 | Security review: after a session expired, a new sign-in kept the previous user's cached queries. Login now clears the whole query cache before storing the new /me. | frontend | src/pages/Login.tsx | src/auth/auth.test.tsx (FIX-20, failed first) | yes | yes |
| FIX-21 | BLOCKER: a branch switch and the Super Admin filter change drop every cached query except /me and the branch directory (dropBranchScoped); Users list no longer keeps another branch's rows as placeholder. | frontend | src/auth/session.ts, src/components/AppShell.tsx, src/features/workingBranch/BranchPicker.tsx, src/features/users/UsersPage.tsx | src/day3-fixes.test.tsx (failed first) | yes | yes |
| FIX-22 | Focus returns to the opener when ConfirmPanel, the one-time-password panel and the branch form close; a save moves focus to the success notice (useReturnFocus, SuccessNotice). | frontend | src/components/focus.tsx, ConfirmPanel.tsx, OneTimePassword.tsx, BranchesPage.tsx, UserDetail.tsx | src/day3-fixes.test.tsx (failed first) | yes | yes |
| FIX-23 | UserDetail uses one idempotency key per action (edit, status, reset). | frontend | src/features/users/UserDetail.tsx | src/day3-fixes.test.tsx (failed first) | yes | yes |
| FIX-24 | Branch-list filter query is enabled only in the all-branches view. | frontend | src/features/workingBranch/BranchFilter.tsx, src/components/AppShell.tsx | src/day3-fixes.test.tsx (failed first) | yes | yes |
| FIX-25 | UsersPage resets to page 1 when the branch filter changes. | frontend | src/features/users/UsersPage.tsx | src/day3-fixes.test.tsx (failed first) | yes | yes |
| FIX-26 | Removed dead ApiProblem in UserDetail Account card. | frontend | src/features/users/UserDetail.tsx | n/a (dead code removal; existing tests) | yes | yes |
| FIX-27 | BUG: a Front Staff sign-in could land on the dashboard instead of the branch picker, because the sign-in answer was trusted and /me never asked again. Login now fetches /me after signing in and uses that; the sign-in answer is only a fallback. AppShell uses /me `all_branches` (contract 0.3.0) instead of inferring it. | frontend | n/a (no git during the day) | src/auth/postLogin.test.tsx (failed first); e2e/f4.spec.ts (Front Staff picker) | no | not yet |
| FIX-28 | Cost could show, and stay cached, for a user without items.view_cost when a PATCH/status/image answer carried average_cost. Cost now shows only if /me allows it and the field is present; the cached row is stripped of it otherwise. | frontend | n/a (no git during the day) | src/day4-fixes.test.tsx (failed first) | no | not yet |
| FIX-29 | Price string was built with Number().toFixed (loses digits on long values). Now built from the typed text; the form says a price can be changed but not removed. | frontend | n/a (no git during the day) | src/day4-fixes.test.tsx (failed first) | no | not yet |
| FIX-30 | Mock POST/PATCH items accepted selling_price without prices.manage. Now 403 permission_denied, as the contract says. | frontend | n/a (no git during the day) | src/mocks/handlers.test.ts (failed first) | no | not yet |
| FIX-31 | If /me answered 401 right after sign-in the app used the sign-in answer. Now it stays on Sign in with "Your sign-in did not hold, try again."; the sign-in answer is used only on a network or server error. | frontend | n/a (no git during the day) | src/day4-fixes.test.tsx (failed first) | no | not yet |
| FIX-32 | Stock grouped by location name, merging two locations with the same name. Now grouped by location_id. | frontend | n/a (no git during the day) | src/day4-fixes.test.tsx (failed first) | no | not yet |
| FIX-33 | Mock GET goods-receipts (list and one) carried cost for every role. Now costed(): Branch Admin and Front Staff get 403. | frontend | n/a (no git during the day) | src/day5-fixes.test.tsx (failed first) | no | not yet |
| FIX-34 | A 409 on the receive decision left the Confirm button up. The delivery is now reloaded so its outcome shows. | frontend | n/a (no git during the day) | src/day5-fixes.test.tsx (failed first) | no | not yet |
| FIX-35 | A received count above the quantity sent reached the confirm step. Now a line error on Review, nothing sent. | frontend | n/a (no git during the day) | src/day5-fixes.test.tsx (failed first) | no | not yet |
| FIX-36 | Reject with a blank reason sent a request. Now a field message and no request. | frontend | n/a (no git during the day) | src/day5-fixes.test.tsx (failed first) | no | not yet |
| FIX-37 | Dispatch line gave no warning when the quantity was above what is available. Now a warning on the line; the server still decides. | frontend | n/a (no git during the day) | src/day5-fixes.test.tsx (failed first) | no | not yet |
| FIX-38 | The mock accepted one Idempotency-Key twice. Now the same key and body replays the first answer; the same key with another body is 409 idempotency_conflict. | frontend | n/a (no git during the day) | src/day5-fixes.test.tsx (failed first) | no | not yet |
| FIX-39 | After a confirmed receipt or dispatch focus stayed on the old button. The success card now takes focus. | frontend | n/a (no git during the day) | src/day5-fixes.test.tsx (failed first) | no | not yet |
| FIX-40 | The dispatch list was guarded by dispatches.create. Now dispatches.view; New dispatch still needs dispatches.create. | frontend | n/a (no git during the day) | src/day5-fixes.test.tsx (failed first) | no | not yet |
| FIX-41 | Cancelling a sale left focus on the page top (the Cancel button disappeared). The opener now stays, so Cancel in the panel returns focus to it, and a confirmed cancel shows a status "Sale ... is cancelled." that takes focus. Test: `src/day6-fixes.test.tsx`. |
| FIX-42 | After Import now, then Cancel, the CSV file input still showed the old file but the page held none, so Check said "Choose a CSV file first." The input is remounted (empty). |
| FIX-43 | An item with no price was only noted on its line. The running total and the confirm step now say how many items have no price; a 400 on a sale line returns to the items step and shows the server message on that line. |
| FIX-44 | Sell line errors were matched by position, so removing a line moved or dropped them. Server errors are mapped by the item ids in the sent order; format errors are keyed by item id and cleared with their line. |
| FIX-45 | Find opened the other-branches panel for every location of the same item. The open state is keyed by location and item. |
| FIX-46 | The mock import committed nothing. A committed import now adds Draft items (no price) and opening stock to the mock store, so /stock/ and /items/ show them (`commitCsv`). |
| FIX-47 | The mock /me home_links did not match the real ones. Now per role as contract 0.5.2 (SA 6 tiles in order, WA 2, BA 3, FS none). | frontend | n/a (no git during the day) | src/day7-fixes.test.tsx (failed first) | no | not yet |
| FIX-48 | Shortfall resolve sent a quantity above what remains to the server. The form now refuses it ("More than the N still open.") and sends no request. | frontend | n/a (no git during the day) | src/day7-fixes.test.tsx (failed first) | no | not yet |
| FIX-49 | Activity filters sent a From date after the To date. Apply now blocks it with an error on To date and makes no request. | frontend | n/a (no git during the day) | src/day7-fixes.test.tsx (failed first) | no | not yet |
| FIX-50 | The low-stock list is cut at 10 rows without saying so. Home now shows "Showing 10 of N" when the count is above the rows. | frontend | n/a (no git during the day) | src/day7-fixes.test.tsx (failed first) | no | not yet |
| FIX-51 | Activity User and Branch filters list only the first 100 users and branches. Added a `shortcut:` comment (upgrade to a search box when there are more). | frontend | n/a (no git during the day) | n/a (comment only) | no | not yet |
| FIX-52 | The login throttling message could not read the cross-origin `Retry-After` header, and the keyboard E2E could race the initial render. Model the exposed header and wait for the sign-in form before tabbing. | frontend | sprint/2-mvp-release | e2e/login.spec.ts, e2e/stub.ts | no | not yet |

## DEPLOYMENT LOG

| Version | Environment | Backup verified | Migrations run | Smoke tests passed | Rollback ready | Approved by owner |
|---|---|---|---|---|---|---|
| (first entry goes here) | | | | | | |