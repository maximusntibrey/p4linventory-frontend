# SKILLS.md: Technical Reference for the Inventory & Warehouse System

> **Document set.** [README](docs/project/README.md) · [1 Overview and Sprints](docs/project/1-Overview-and-Sprints.md) · [2 Frontend](docs/project/2-Frontend-Requirements.md) · [3 Backend](docs/project/3-Backend-Requirements.md) · [4 DevOps](docs/project/4-DevOps-Requirements.md) · [TASKS](TASKS.md) · [SKILLS](SKILLS.md) · [Gaps and actions](docs/project/PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](docs/project/5-Detailed-Requirements.md), [6 Functional Workflow Specification](docs/project/6-Functional-Workflow-Specification.md).
>
> Section references such as "BE s3.8" use the abbreviations in Appendix C.

## Project Overview

**Purpose:** A web system for Payless4Laptops that tracks inventory across one central warehouse and several branches, records stock movements and sales, and controls who can see and do what.

**Business Objectives:**
- Know exactly how much of each item is at the warehouse and at each branch
- Move stock from the warehouse to branches, and later between branches, with a clear trail and handling of shortfalls
- Record sales so stock reduces automatically
- Give every action an owner, a time and a branch
- Show stock on the company website through a read-only API (Sprint 9)

**Main modules:**
- accounts, roles - Users, login IDs, roles, default workspace
- branches, branch_access - Locations, permanent branch, temporary access requests and switch log
- inventory - Products, variants (SKU), categories, specifications, stock balances
- warehouse - Suppliers, goods receipts (GRN)
- transfers - Dispatches and branch-to-branch transfers, receiving decisions, discrepancies
- sales - Sales, payments, customers, receipts, cancellations
- stock_ledger - The append-only record of every stock movement
- approvals - Approval requests and decisions
- notifications - In-app notifications
- reports - Dashboards, report queries, exports
- audit - The append-only audit trail

**Intended users:**
- Super Admin (everything, every branch)
- Warehouse Admin (items, receipts, dispatch, sees cost)
- Branch Admin (runs a branch, receives, sells, cancels sales, no cost)
- Front Staff (sells, finds items, receives where permitted, no cost)

## Technology Stack

| Layer | Choice | Status |
|---|---|---|
| Backend | Python with Django and Django REST Framework | Approved |
| Database | PostgreSQL | Approved |
| Frontend | React | Approved |
| Frontend tooling | TypeScript, Vite, React Router, TanStack Query, react-hook-form with zod | Proposed |
| Styling and icons | Tailwind CSS with the design tokens in FE s2; Lucide icons | Proposed (Tailwind); Approved (Lucide) |
| API style | REST over JSON, versioned URLs, session-based login | Approved |
| API contract | OpenAPI document, published by the backend first | Approved (OVR s3); generator drf-spectacular [P] |
| Tests | pytest with pytest-django and factory-boy; Vitest, React Testing Library, Playwright, axe | Proposed |
| Quality tools | ruff, mypy or django-stubs, bandit, pip-audit; ESLint, Prettier, npm audit | Proposed |
| Hosting, domains, object storage | Not chosen | Open (DEVOPS s12, step O1.1; GAP-H01) |
| Error monitoring | Sentry on both sides | Proposed (BE s11 requires "error monitoring"; DEVOPS s8) |

## System Architecture

**Two repositories, one contract.** `eqp4l-backend` (Django) and `p4linventory-frontend` (React) are built and deployed separately. The OpenAPI document is the only link.

```
Browser (React)  --HTTPS, session cookie, JSON-->  Django REST API  -->  PostgreSQL
      |                                               |  |  |
      |  generated types and mocks                    |  |  +-- object storage (images, documents) [P]
      +----------- OpenAPI contract <-----------------+  +----- scheduled jobs (reminders, backups) [P]
```

**Component responsibilities:**
- **Frontend:** Shows what the API allows, reports what the API rejects. Never decides a business rule and never duplicates one. Menus and buttons are built from the user's permissions returned by the API. Item forms are built from field definitions returned by the API.
- **Backend:** Enforces every rule: permissions, branch scope, stock validation, approvals, audit. Returns data and plain-language errors that name the field at fault. Never depends on how screens look.
- **Stock service:** One service performs every stock change, inside a database transaction with row-level locks, and writes the ledger entry in the same transaction. No other code touches balances.
- **Audit service:** Writes append-only audit events for every important action.

## Coding Standards

**Backend (Django):**
- One Django app per module. Business rules live in service functions, not in views, serializers or models' `save()`.
- Views are thin: authenticate, check permission, call a service, return a serializer.
- Names: `snake_case` for Python, `PascalCase` for classes, plural nouns for URL collections, singular for model names.
- Use a custom user model from the first migration.
- Never write raw SQL for business logic. Use the ORM, with `select_for_update()` for stock rows.
- Every public function that changes data has a docstring naming the rule it enforces and the audit event it writes.

**Frontend (React with TypeScript):**
- Feature folders by screen group (`sell`, `receiving`, `items`, `users`). Shared UI components in one place (UI kit).
- Typed API client generated from the OpenAPI document. Do not hand-write request types.
- One component per task screen. One primary button per screen.
- No business logic in components. If you are about to write "if the role is X then...", stop: the API must tell the screen what is allowed.
- Every icon has a visible text label.

## Database Standards

- **Custom user model** with a unique, immutable login ID.
- **Roles** by many-to-many assignment or a dedicated user-role model. **Permanent branch** stored separately from **temporary branch access grants**.
- **Append-only tables.** The stock ledger and the audit trail accept inserts only. No application role can update or delete them. Corrections are new rows linked to the original.
- **No deleting history.** Items with transactions are Discontinued, not deleted. Deactivated users and branches keep their records. Images with history are hidden, not deleted.
- **Transactions and locks.** Every multi-step stock operation runs in one transaction with row-level locking. Duplicate submissions are blocked with idempotency keys or unique operation references.
- **No negative stock** unless an explicit exception policy exists.
- **Timestamps** are timezone-aware, stored in UTC and shown as Africa/Accra. Storing in UTC is proposed.
- **Audit fields** on editable records: created by, created at, last changed by, last changed at.
- **Money** is a fixed-point decimal in GHS with two decimal places. Never floating point.
- **Quantities** are positive whole numbers unless the unit of measure allows decimals.
- **Migrations** are committed with the code and never edited after they are applied anywhere. Add a new migration instead.
- **Keys.** Internal primary key type and public reference formats for SKU, GRN, transfer, sale, receipt and request numbers are open. Only SA-0001 and USR-0001 are given as examples.
- **Stock buckets** (on hand, reserved, in transit, quarantined or damaged, available) are named in BE s3.8, and posted to the ledger as in SPEC s11.2 (decided 2026-11-18): dispatch moves quantity from available to reserved at the sender and marks it in transit; receipt clears the reservation and credits the destination's on hand with the approved quantity only. Available equals on hand minus reserved. How the buckets are stored is set in the ERD.
- **Ready for per-unit tracking later (GAP-C02, decided 2026-11-18).** Stock stays at SKU-and-location level. Every stock ledger row carries a stable source reference and line ID, so a unit reference can be added later as a new optional link. No unit, barcode or serial tables are built now.
- **Entity relationships.** No ERD exists. The ERD is a Sprint 1 Day 1 deliverable and must be approved before migrations are written.
- **Retention and deletion** of personal data, logs and backups: open.

## Authentication and Authorization

**Login.** Users sign in with their login ID and password. Super Admins use SA-0001 style IDs. All other users use USR-0001 style IDs. IDs are system-generated, never changed and never reused.

**Accounts.** Create, edit, activate, deactivate and suspend accounts. Reset credentials. View last login, session history and activity. Deactivation keeps history.

**Roles.** Super Admin, Warehouse Admin, Branch Admin, Front Staff. One account per person. Only Super Admins can assign more than one role to a user.

**Branch rules.**
- Front staff choose a working branch after login. Every request then uses that branch. They can switch during the day and each switch is logged.
- Other users have one permanent branch. Working at another branch needs an approved request with a reason, approved by the destination Branch Admin or a Super Admin.
- Combined roles: a user with more than one role switches between them. Switching changes the whole view (menu, home dashboard, screens) to the selected role, the server applies only that role's permissions, and each switch is logged.
- Per-person permissions (Receive stock, Manage prices, discount) are granted by a Super Admin, from the user edit screen until the Sprint 5 role screen.
- Cross-branch stock lookup: any logged-in user may see other branches' quantity for an item, branch name and quantity only. This is an explicit exception to branch isolation.

**Enforcement.** Every protected action is checked on the server against role, active branch and any approved access. Use permission classes plus service-layer checks for critical operations.

**Approvals.** A requester cannot approve their own request. A Super Admin can, and each self-approval is flagged in the audit trail.

## Business Rules

Only rules approved in the current documents are listed as approved. Anything marked open is not implemented until the owner answers.

**Locations and branches**
- One central warehouse and multiple branches. Each location holds its own stock balances.
- Branches can be activated and deactivated. Deactivation keeps history.
- Warehouse-to-branch assignment is restricted to Warehouse Admin and Super Admin.

**Items**
- Categories are Laptop, Laptop Part and Accessory, each with a sub-type.
- Item status is Draft, Active or Discontinued. Only Active items can be received, assigned or sold.
- An item needs at least one image.
- Items with transaction history cannot be deleted. Edits are audited with before and after values. Duplicate warnings fire on matching SKU or near-identical name and model.
- Stock is a quantity per SKU at each location. Individual pieces are not tracked.

**Pricing**
- A price list sets the selling price per SKU with history, and an optional branch override. Only Super Admin or a role with Manage prices can change prices.
- A selling price below cost triggers a warning.
- Cost is recorded at warehouse receipt. Average cost is used for valuation and margin.

**Warehouse receiving**
- A receipt records supplier, items, quantities and cost, and gets a unique reference. Balance and ledger entries commit together. Duplicate submission is blocked. Receipts are never silently edited.

**Transfers**
- Warehouse Admin dispatches to a branch. Branch Admin starts a branch-to-branch transfer, with a reason.
- The system validates available stock and reserves it. It shows as in transit. In-transit stock cannot be sold by the sender or the receiver.
- The destination enters the quantity that arrived and chooses approve all, approve partially with a note, or reject with a reason. Only approved quantities are credited. The sender cannot approve receipt.
- At a branch, receiving is done by Branch Admin and by front staff who hold the Receive stock permission, granted per person by a Super Admin.
- A shortfall stays linked to the transfer as a discrepancy until resolved by return to sender, confirmed loss, recorded damage, or another authorised disposition. Any admin role (Super Admin, Warehouse Admin, Branch Admin) may resolve it within its allowed branches; front staff cannot. Basic resolution for dispatch shortfalls is in the MVP (Sprint 2), extended to branch transfers in Sprint 4.
- Transfers not confirmed within a set time (suggested 48 hours) trigger a reminder and appear as overdue.

**Sales**
- Sales are recorded in the branch the user is working in. The system blocks a sale when any quantity exceeds stock available at that branch.
- Prices come from the price list. Front staff cannot override a price without permission.
- Payment methods: cash, mobile money, card, and split payments. Methods are configurable.
- Customer name and phone are required for warranty-bearing items. Otherwise optional.
- Discounts only by a role with discount permission, with a mandatory reason and a recorded limit.
- Sale confirmation, stock deduction, ledger entry and audit event succeed or fail together.
- Completed sales are never edited. Cancel, refund and exchange use reversal workflows linked to the original sale. Super Admin and Branch Admin may cancel with a reason.
- Daily close: each branch reconciles cash and mobile money totals with recorded sales; variances are logged.

**Adjustments and reversals**
- Adjustment types: damaged, expired, count variance, found stock, entry correction, restockable return. Every adjustment has a mandatory reason and approval where policy requires.
- A reversal is a separate compensating movement linked to the original, which stays visible.

**Notifications.** In-app only for now. Events: incoming transfers, transfer status changes, access requests and decisions, low stock, discrepancies, overdue transfers and pending approvals. Notifications never grant permissions or approve anything.

**Audit.** Append-only. Each event records user ID, role and workspace, active branch, action, reference, previous and new values, timestamp and IP or device. Events include logins, failed logins, logouts, account and role changes, branch access and switches, receipts, dispatches, receiving decisions, transfers, sales, cancellations, refunds, exchanges, role switches, shortfall resolutions, adjustments, approvals, exports and sensitive admin changes.

**Website API.** Read-only: product search, product detail, availability by branch. Secured by API key with rate limits. Exposes no costs, customers or sales data.

## Workflow Implementation Standards

**Status vocabularies** (use these exact words in the database, API and screens).

| Object | Statuses | Source |
|---|---|---|
| Item | Draft, Active, Discontinued | BE s3.2 |
| Transfer | Draft, Dispatched, In transit, Partially received, Completed, Rejected, Under investigation | SPEC s5.4, decided 2026-11-18 (no separate "pending") |
| Branch access request | Pending, Approved, Rejected, Expired, Revoked | SPEC s3.3 |
| Sale | Completed, Cancelled, Refunded, Exchanged | Decided 2026-11-18 (replaces SPEC s7.1; "Voided" is not used) |
| Account | Active, Pending activation, Suspended, Deactivated | Proposed from SPEC s2.1, s2.5 |

**Rules for every workflow:**
1. Define the starting point, who starts it, the permission required, the preconditions, the main path, the decisions, the rejection path, the error path, the notifications, the data changes, the final state and the audit event before writing code.
2. Status changes happen only through service functions that check the allowed transitions.
3. A process that changes stock, writes a ledger entry and writes an audit event does all three in one transaction.
4. Approval workflows record requester, approver, decision, reason and time. The requester cannot approve their own request, except a Super Admin, which is flagged.
5. Rejections keep the original data visible and record a reason. Nothing is deleted.
6. Reversals and corrections create new linked records. Never edit a confirmed transaction.
7. Every state-changing request is safe to retry. Send and honour an idempotency key.
8. Notifications are side effects. A failed notification never rolls back a stock change. They never grant permission.
9. Every workflow has a documented failure case: what the user sees and what state the data is left in.

## API Development Standards

- **Contract first.** The backend publishes the OpenAPI document on Sprint 1 Day 1 and keeps it current. The frontend builds on it with mock responses. Changing the contract: propose, agree with the owner, update the contract file, then adjust both sides. Breaking changes only at a sprint boundary.
- **Versioned URLs.** Pattern `/api/v1/<plural-noun>/`.
- **Methods.** GET reads and never changes data. POST creates or performs an action. PATCH changes part of a record. DELETE is rarely used because history is kept.
- **Session login.** Authenticate by session cookie.
- **Lists are paginated.**
- **One error format** with plain-language messages naming the field at fault.
- **Validation.** Every request is validated by the backend. Never trust the client for permissions, prices, branch or quantities.
- **Permissions.** Each endpoint declares the permission it needs. The response never includes data the user may not see (for example cost).
- **Field definitions.** The API returns the field definitions for each item category so forms are built from them.
- **Idempotency.** State-changing endpoints for receipts, dispatches, transfers and sales accept an idempotency key.
- **Performance.** Search and the product list respond in about two seconds under normal load.
- **Website API.** Separate, read-only, API key and rate limits, no costs, customers or sales data.

## Security Standards

All of these are approved unless marked proposed.

- **Passwords** are hashed. Use a modern algorithm such as Argon2.
- **Sessions** are secure and expire. Cookies are secure and HTTP-only. HTTPS everywhere.
- **Rate limiting** on login. Failed and successful logins are logged.
- **Server-side permission checks** on every protected action. Never rely on the frontend.
- **Input.** Validate type, length and range on every field. Use the ORM and parameterised queries. Escape output (React does this by default; never use `dangerouslySetInnerHTML` with user data). Validate uploaded file type and size on the server, and do not trust the file name.
- **Secrets** never go in code or git. They live in environment variables or the host's secret store. `.env` is git-ignored.
- **Sensitive data.** Cost is visible only to Super Admin and Warehouse Admin. Cross-branch lookup shows branch name and quantity only. The website API shows no costs, customers or sales.
- **Personal data.** Customer name and phone, staff details and IP addresses: protect and limit. Retention rules: open.
- **Audit.** Audit trail and ledger are append-only. Exports are audited.
- **Dependencies.** Pin versions, scan for known problems before every release, update one dependency at a time.
- **Unauthorised operations.** A user must never be able to: act outside their role, see another branch's data (except the lookup), approve their own request (except Super Admin, flagged), edit the ledger or audit trail, or change cost or price without permission.

## Testing Standards

**Required areas:** role permissions, branch isolation (with the cross-branch lookup exception), partial receiving, transfer discrepancies, stock concurrency, reversals, audit immutability.

**Test types:**
- **Unit tests** for service functions: stock service, ID generator, validation rules, price and cost calculations.
- **Integration tests** for each API endpoint: allowed role succeeds, every other role is refused, wrong branch is refused, bad input returns the standard error.
- **Workflow tests** for each complete flow: receive, dispatch, branch receive (all, partial, reject), discrepancy resolution, sale, cancel, adjustment, access request. Check balances, ledger rows and audit events after each.
- **Permission tests** as a matrix: every role against every protected endpoint. The matrix comes from the approved permission table.
- **Concurrency tests:** two simultaneous sales or dispatches of the last unit. Exactly one succeeds.
- **Regression tests:** the full suite runs on every pull request. A bug fix includes a test that failed before the fix.
- **Frontend:** component tests for the item form and validation, lists and filters, the sell flow and the receiving flow; end-to-end smoke test against staging; UI checks for 360 px width, labelled icons and keyboard-only use.
- **Acceptance tests:** measurable pass or fail scripts for each release.

## Development Rules for AI Agents

These are mandatory.

1. **Check the development gate.** Read TASKS.md rule 0.7 and the status of the critical gaps in PROJECT_GAPS_AND_ACTIONS.md. If development is not authorised, write no application code.
2. **Inspect before changing.** Always read the existing code and the files you will touch before modifying them.
3. **Read the requirements.** Before implementing a feature, read the relevant sections of the requirements documents (files 1 to 4), this file, and the matching step in TASKS.md.
4. **Never invent business rules.** If a rule is missing, vague or tagged open, stop, add a line under "Open questions" in TASKS.md, and ask the owner.
5. **Flag incomplete requirements before implementing**, not halfway through.
6. **Never bypass permissions.** No shortcut, backdoor, debug switch or temporary override that skips a permission, branch or approval check.
7. **Never duplicate existing functionality** without writing down why. Reuse the stock service, the audit service and the shared UI components.
8. **Never make unrelated changes.** One purpose per branch and pull request.
9. **Never remove existing functionality** without the owner's authorisation.
10. **Keep modules consistent** with the approved architecture. A new app, table or endpoint that is not in the plan needs approval.
11. **Update documentation** whenever a change alters documented behaviour: requirements, workflows, API contract, this file.
12. **Test affected workflows** after every change, and run the repo's single check command.
13. **Never claim a feature is complete without evidence:** passing tests, the check command output, and for screens a look at the running page.
14. **Respect the two repositories.** Backend work only in `eqp4l-backend`. Frontend work only in `p4linventory-frontend`. Never edit one while in the other.
15. **Follow the git rules** in TASKS.md section 1: identity, branches, one commit per step, pull requests, no force pushes. Fixes, patches and updates follow section 1.7.
16. **Do not install or add dependencies** that are not vetted. Record every install in Appendix A.
17. **Never expose or log secrets, passwords or personal data.**
18. **Stop and ask** if any of these happens: a rule seems wrong, two documents disagree, a task needs data or access you do not have, a step would delete data, or a change would affect production.

## Project Completion Standards

**A feature is done only when all of these are true:**
1. It matches a written requirement and no unresolved open decision applies.
2. The backend enforces every rule, and the frontend only shows and reports.
3. Tests exist for the happy path, each rejection path, each permission, and each failure path. They were run and passed, and the real output is recorded.
4. The repo's single check command is green (lint, type check, security scan, tests, build).
5. It writes the right ledger and audit entries where relevant.
6. Documentation is updated: requirements, workflow, API contract, this file, TASKS.md ticks.
7. For screens: works at 360 px, tap targets at least 44 px, every icon labelled, keyboard use works, status not shown by colour alone.
8. The change went through a pull request, was merged by the rules in TASKS.md section 1, and the step was ticked in the same pull request.

## Appendix A: Install register

One register per repository. Record every tool, package and skill installed. Nothing is installed without vetting (TASKS.md 2.1: check, vet, pin, verify, record, commit). This is the register for **p4linventory-frontend**. Vetting checks used: official publisher and source, licence, maintenance (last push), and published GitHub security advisories for the repository (none found for any item below on 2026-11-18).

### A.1 Register

| Date | Repo | Name | Version | Purpose | Vetted by | Notes |
|---|---|---|---|---|---|---|
| 2026-11-18 | p4linventory-frontend | Install test: `six` (PyPI) | 1.17.0 | T.0: prove `pip install` works | Orchestrator, devops | Throwaway scratch venv only, not a project dependency. Re-run by devops: `pip install six==1.17.0` then `import six` printed `six 1.17.0` |
| 2026-11-18 | p4linventory-frontend | Install test: `is-number` (npm) | 7.0.0 | T.0: prove `npm install` works | Orchestrator, devops | Throwaway scratch folder only. Re-run by devops: `added 1 package ... found 0 vulnerabilities`, `require('is-number')(5)` printed `true` |
| 2026-11-18 | p4linventory-frontend | Git for Windows | 2.56.0.windows.4 | T.1: version control | devops | Already installed. Identity set locally per repo (TASKS 1.2). The system git config sets `core.autocrlf=true`, so `.gitattributes` forces LF |
| 2026-11-18 | p4linventory-frontend | GitHub CLI `gh` | 2.105.0 | T.1: pull requests, branch protection, repo settings | Orchestrator | Publisher GitHub Inc., MIT, installed with winget (hash verified). Path `C:\Program Files\GitHub CLI\gh.exe`. `gh auth status`: logged in as `maximusntibrey`, scopes `gist`, `read:org`, `repo`, `workflow`; `gh auth setup-git` done |
| 2026-11-18 | p4linventory-frontend | Claude skills `docx`, `pdf`, `xlsx`, `frontend-design`, `skill-creator` | Bundled with Claude Code (no version number) | T.2: user guides, PDF reading and export, spreadsheet checks, UI work, project skills | devops | Present in `~/.claude/skills/`. No separate `file-reading` or `pdf-reading` skill exists: reading PDFs is covered by the `pdf` skill ("reading or extracting text/tables from PDFs") and plain file reading by Claude Code's built-in Read tool. The requirements are already converted to Markdown |
| 2026-11-18 | p4linventory-frontend | `pre-commit` (PyPI) | 4.7.0 | T.3: runs the git hooks | devops | Publisher pre-commit/pre-commit, MIT, last push 2026-11-09, no advisories. Installed in a dedicated venv `%USERPROFILE%\.venvs\pre-commit-4.7.0` (Python 3.13.17) so the hook survives worktree removal. Pinned dependencies resolved by pip: cfgv 3.5.0, distlib 0.4.4, filelock 4.2.12, identify 2.6.20, nodeenv 1.12.0, packaging 26.3, platformdirs 4.14.7, python-discovery 1.9.6, pyyaml 6.0.3, virtualenv 21.15.8. CI installs `pre-commit==4.7.0`. Hook installed with `pre-commit install --allow-missing-config` |
| 2026-11-18 | p4linventory-frontend | `pre-commit-hooks` | v6.0.0 (commit 3e8a870) | T.3: file lint, private-key and AWS-key detection, no direct commits to `main`, `develop`, `sprint/*` | devops | Publisher pre-commit, MIT, last push 2026-11-04, no advisories. Pinned by commit SHA in `.pre-commit-config.yaml` |
| 2026-11-18 | p4linventory-frontend | `gitleaks` | v8.30.1 (commit 83d9cd6) | T.3: block secrets before commit; CI scans full history | devops | Publisher gitleaks, MIT, about 31k stars, last push 2026-10-28, no advisories. Local hook is built from source by pre-commit, which bootstrapped Go 1.27.4 into its own cache (no system Go installed). CI downloads the official `gitleaks_8.30.1_linux_x64.tar.gz` and verifies it against the SHA-256 pinned in `ci.yml` (`GITLEAKS_SHA256=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`). The value was taken from the official `gitleaks_8.30.1_checksums.txt` and cross-checked on 2026-11-18 against a local `sha256sum` of the downloaded tarball and the GitHub release asset digest (all three match). Smoke test: a staged fake GitHub token gave `RuleID: github-pat ... leaks found: 1` and the commit was refused |
| 2026-11-18 | p4linventory-frontend | GitHub Action `actions/checkout` | v7.0.1 (commit 3d3c42e) | G.5: CI checkout | devops | Publisher GitHub, MIT, pinned by commit SHA |
| 2026-11-18 | p4linventory-frontend | GitHub Action `actions/setup-python` | v7.1.0 (commit 6d4fd22) | G.5: Python 3.13 for pre-commit in CI | devops | Publisher GitHub, MIT, pinned by commit SHA |
| 2026-11-18 | p4linventory-frontend | Node.js (pinned in `.nvmrc`) | 26.13.1 (LTS "Lithium") | T.16: runtime for the toolchain and CI | devops | Official nodejs.org release index: 26.13.0 (2026-10-28) was the first LTS of line 26; 26.13.1 (2026-11-10) is a security release, so it is the pinned version. CI uses it via `actions/setup-node` with `node-version-file: .nvmrc`. **Local mismatch:** this machine has 26.13.0 (same LTS line, before the security fix), so `npm install` prints an `EBADENGINE` warning against `"engines": {"node": ">=26.13.1 <27"}`. No version manager was installed; the owner updates local Node with the official installer (OQ-14) |
| 2026-11-18 | p4linventory-frontend | npm | 11.20.0 | T.16: package manager (npm, not pnpm) | devops | Bundled with Node 26.13.0 and 26.13.1. `.npmrc` sets `save-exact=true`. All versions locked in `package-lock.json` (lockfile v3); CI installs with `npm ci` |
| 2026-11-18 | p4linventory-frontend | GitHub Action `actions/setup-node` | v7.1.0 (commit 949feb2) | G.5 / T.16: Node from `.nvmrc` in CI, npm cache | devops | Publisher GitHub, MIT, last push 2026-11-17, no advisories. Pinned by commit SHA |
| 2026-11-18 | p4linventory-frontend | `react`, `react-dom` | 19.3.1 | T.17: UI library | devops | Publisher React (repo `react/react`, formerly `facebook/react`), MIT, last push 2026-11-18. The repo's 10 published advisories all concern `react-server-dom-*` (server components), not used here; 19.3.1 is also the patched version for them |
| 2026-11-18 | p4linventory-frontend | `@types/react`, `@types/react-dom` | 19.3.0 | T.17: React types | devops | DefinitelyTyped, MIT, types only |
| 2026-11-18 | p4linventory-frontend | `typescript` | 5.9.3 | T.17: type checking (`tsc -b`) | devops | Microsoft, Apache-2.0, no advisories. **Not the latest major (7.0.2):** `typescript-eslint` 8.73.0 supports TypeScript `<6.1.0` and `openapi-typescript` 7.13.0 needs `^5.x`, so 5.9.3 (latest 5.x) is the newest version all tools accept. Revisit when they support 6 or 7 |
| 2026-11-18 | p4linventory-frontend | `vite` | 8.3.8 | T.17: dev server and production build | devops | vitejs, MIT, last push 2026-11-18. 24 repo advisories checked: 8.3.8 is at or above every patched version (latest: GHSA-p4f5-76q4-ffq7, fixed in 8.3.7) |
| 2026-11-18 | p4linventory-frontend | `@vitejs/plugin-react` | 6.3.0 | T.17: React support in Vite | devops | vitejs, MIT. The repo's advisories concern `@vitejs/plugin-rsc` only (not used) |
| 2026-11-18 | p4linventory-frontend | `@types/node` | 26.6.6 | T.17: Node types for `vite.config.ts`, `playwright.config.ts` and `e2e/` | devops | DefinitelyTyped, MIT, types only. Supporting package (peer of Vitest) |
| 2026-11-18 | p4linventory-frontend | `react-router` | 8.5.2 | T.18: routing (routes are F1.3) | devops | Remix/Shopify, MIT, last push 2026-11-18. 22 repo advisories checked: all fixed at or below 8.3.0 (latest for v8: GHSA-qwww-vcr4-c8h2, fixed in 8.3.0) |
| 2026-11-18 | p4linventory-frontend | `@tanstack/react-query` | 5.108.0 | T.18: data fetching and caching | devops | TanStack, MIT, last push 2026-11-18. Its one advisory concerns `@tanstack/react-query-next-experimental` (not used) |
| 2026-11-18 | p4linventory-frontend | `react-hook-form` | 7.92.0 | T.18: forms and inline validation | devops | react-hook-form, MIT, last push 2026-11-18, no advisories |
| 2026-11-18 | p4linventory-frontend | `zod` | 4.6.7 | T.18: schemas for form validation | devops | colinhacks, MIT, last push 2026-11-16, no advisories |
| 2026-11-18 | p4linventory-frontend | `@hookform/resolvers` | 7.0.7 | T.18: connects react-hook-form to zod (`zodResolver`) | devops | Same publisher as react-hook-form, MIT, last push 2026-11-17, no advisories. Not named in TASKS 2.4 but required for "react-hook-form with zod"; flagged to the orchestrator |
| 2026-11-18 | p4linventory-frontend | `tailwindcss`, `@tailwindcss/vite` | 4.3.5 | T.19: styling with the design tokens (theme in `src/index.css`) | devops | Tailwind Labs, MIT, last push 2026-11-18, no advisories. Default palette and fonts removed so only the FE s2 tokens exist; verified by building a probe: `min-h-tap`, `bg-accent`, `text-status-low` generated, `bg-red-500`, `text-blue-600` not generated |
| 2026-11-18 | p4linventory-frontend | `lucide-react` | 1.75.0 | T.19: the one outline icon set | devops | Lucide, ISC (GitHub shows NOASSERTION because the repo has several licence files; npm metadata says ISC), last push 2026-11-18, no advisories |
| 2026-11-18 | p4linventory-frontend | `openapi-typescript` | 7.13.0 | T.20: types from the OpenAPI contract (`npm run api:types`) | devops | openapi-ts, MIT, last push 2026-09-25, no advisories. Script only: the contract arrives with B1.3 and the typed client with F1.4 (T.20 stays open). Smoke test: generated types from a throwaway one-path spec in the scratchpad (`status: string;` produced) |
| 2026-11-18 | p4linventory-frontend | `msw` | 3.0.7 | T.21: mock API responses in tests and development | devops | mswjs, MIT, last push 2026-11-18, no advisories. Worker file `public/mockServiceWorker.js` created with `msw init public --save` (PACKAGE_VERSION 3.0.7). Smoke test `src/test/msw.test.ts` intercepts a request with `msw/node`. Handlers from the contract are F1.4 |
| 2026-11-18 | p4linventory-frontend | `vitest` | 5.1.1 | T.22: unit and component test runner | devops | vitest-dev, MIT, last push 2026-11-18. 10 repo advisories checked: none affects 5.1.1 (`@vitest/browser` and `@vitest/ui` are not installed) |
| 2026-11-18 | p4linventory-frontend | `jsdom` | 31.0.1 | T.22: browser-like test environment for Vitest | devops | jsdom, MIT, last push 2026-11-13, no advisories. Supporting package |
| 2026-11-18 | p4linventory-frontend | `@testing-library/react` | 16.3.3 | T.22: component tests | devops | testing-library, MIT, last push 2026-08-27, no advisories |
| 2026-11-18 | p4linventory-frontend | `@testing-library/dom` | 10.4.2 | T.22: required peer of `@testing-library/react` | devops | testing-library, MIT, last push 2026-09-15, no advisories |
| 2026-11-18 | p4linventory-frontend | `@testing-library/jest-dom` | 7.0.1 | T.22: DOM matchers (`toBeInTheDocument`) | devops | testing-library, MIT, last push 2026-08-09, no advisories |
| 2026-11-18 | p4linventory-frontend | `axe-core` | 4.14.1 | T.22: accessibility checks in component tests (`src/test/axe.ts`) and in the Playwright smoke test | devops | Deque, MPL-2.0, last push 2026-11-17, no advisories. Used directly instead of `vitest-axe` (see A.3). A negative-control test proves the helper catches a real violation (`button-name`) |
| 2026-11-18 | p4linventory-frontend | `@playwright/test` | 1.65.1 | T.22: end-to-end smoke test (`e2e/smoke.spec.ts`) | devops | Microsoft, Apache-2.0, last push 2026-11-18, no advisories. Browsers are not committed. Local: `npx playwright install chromium` downloaded Chrome for Testing 159.0.8154.6 (playwright chromium v1255) from `cdn.playwright.dev` into `%LOCALAPPDATA%\ms-playwright`. CI: `npx playwright install --with-deps chromium` (version follows the lockfile) |
| 2026-11-18 | p4linventory-frontend | `eslint`, `@eslint/js` | 9.39.5 | T.23: linting | devops | OpenJS/ESLint, MIT, no advisories. **ESLint 9 is end of life** (npm marks 9.39.5 "no longer supported"; 10.x is current). Kept on 9 because `eslint-plugin-jsx-a11y` 6.10.2 only supports ESLint up to 9 (its ESLint 10 support issue #1075 is still open). Owner decision in OQ-15 |
| 2026-11-18 | p4linventory-frontend | `typescript-eslint` | 8.73.0 | T.23: TypeScript lint rules (`strictTypeChecked`, `stylisticTypeChecked`) | devops | typescript-eslint, MIT, last push 2026-11-18, no advisories |
| 2026-11-18 | p4linventory-frontend | `eslint-plugin-jsx-a11y` | 6.10.2 | T.23: accessibility lint rules (`strict` config) | devops | jsx-eslint, MIT, no advisories. Last release 2024-10-26, repo last push 2026-01-06: slow maintenance, but named in TASKS 2.4 and still the standard JSX accessibility linter |
| 2026-11-18 | p4linventory-frontend | `eslint-plugin-react-hooks` | 7.1.1 | T.23: React hooks rules | devops | React team, MIT, last push 2026-11-18. Supporting package (standard for React with ESLint) |
| 2026-11-18 | p4linventory-frontend | `eslint-config-prettier` | 10.1.8 | T.23: turns off ESLint rules that clash with Prettier | devops | Prettier org, MIT, last push 2026-10-20, no advisories. Supporting package |
| 2026-11-18 | p4linventory-frontend | `globals` | 17.14.0 | T.23: browser and Node globals for the ESLint config | devops | sindresorhus, MIT, last push 2026-11-01, no advisories. Supporting package |
| 2026-11-18 | p4linventory-frontend | `prettier` | 3.10.1 | T.23: formatting (`npm run format`, `format:check`) | devops | Prettier, MIT, last push 2026-11-18. Its one advisory (GHSA-4cm8-f57v-mqm6) affects 3.9.0 to 3.9.9 only |
| 2026-11-18 | p4linventory-frontend | Transitive npm dependencies | 433 packages in a clean `npm ci` (483 entries in `package-lock.json`, including optional platform binaries) | Pulled in by the packages above | devops | Exact versions locked in `package-lock.json`. `npm audit` on 2026-11-18: `found 0 vulnerabilities`. Note: an earlier run the same day reported 12 "high" findings, all from one picomatch advisory (GHSA-fc5q-39xc-vjpf) that GitHub **withdrew** at 2026-11-18T15:38:56Z; after npm's data refreshed the audit was clean. The lockfile includes the Linux bindings CI needs (`@rolldown/binding-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`, `lightningcss-linux-x64-gnu`) |
| 2026-11-18 | p4linventory-frontend | Pre-commit local hooks `eslint`, `prettier` | Same versions as above (run from `node_modules`) | T.3 / T.23: lint and format check before every commit | devops | Local hooks in `.pre-commit-config.yaml` (`language: system`, `node node_modules/...`), so the hook and `npm run check` use the same pinned versions. Negative test: a staged file with `any` and bad formatting failed both hooks (`no-explicit-any`, `no-unsafe-return`; Prettier "Code style issues found") |

### A.2 Environment found on this machine (not installed by these steps)

| Tool | Version | Notes |
|---|---|---|
| Python | 3.13.17 (`py -V:3.13`) | Owner chose Python 3.13 with Django 5.2 LTS. Python 3.15.2 is also installed and must not be used |
| Node.js / npm | v26.13.0 / 11.20.0 | LTS line 26. `.nvmrc` pins 26.13.1 (security release) for CI; local update pending (OQ-14) |
| Docker | 29.9.3 | Daemon running. Used from O1.2 |
| make, psql, pg_dump | Not installed | The check command is a script, not `make` (see A.3). Planned: run `pg_dump` inside the PostgreSQL container (T.14) |

### A.3 Tooling decisions

- **Line endings:** `.gitattributes` with `* text=auto eol=lf`, plus `.editorconfig` (T.3).
- **Pre-commit hooks:** the `pre-commit` framework in both repos, so one tool covers lint and secret blocking on Windows and in CI. Install once per clone with `pre-commit install --allow-missing-config` (the flag keeps commits working on branches that do not have the config yet).
- **Check command:** `make` is not installed on the Windows machine. The frontend check command is `npm run check` (T.24): `eslint . --max-warnings=0`, `prettier --check .`, `tsc -b`, `vitest run` (component tests include axe checks), `vite build`, `npm audit` (any severity fails). It runs the same on Windows and Linux (npm scripts chained with `&&`). The Playwright smoke test is a separate command, `npm run test:e2e`, because it needs a browser download; CI runs it right after the check command in the same `check` job.
- **CI:** GitHub Actions, workflow `.github/workflows/ci.yml`, job `check`. Every action is pinned to a commit SHA. Steps: checkout, Node from `.nvmrc`, `npm ci`, pre-commit hooks (including ESLint and Prettier), full-history gitleaks scan, `npm run check`, `npx playwright install --with-deps chromium`, `npm run test:e2e`.
- **Package manager:** npm (not pnpm), exact versions (`.npmrc` `save-exact=true`, no `^` or `~`), `package-lock.json` committed, `npm ci` in CI.
- **TypeScript:** 5.9.3, the newest version that both `typescript-eslint` and `openapi-typescript` accept. Strict mode plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **Accessibility tests:** `axe-core` is used directly (TASKS 2.4 allows "`axe-core` / `vitest-axe`"). `vitest-axe` failed the maintenance check: its last stable release is 0.1.0 (2022), only `1.0.0-pre.*` builds since (last 2025-01-22), and the repo was last pushed 2025-02-11. In jsdom the `color-contrast` rule is off (no layout engine); the Playwright smoke test runs the full axe rule set, contrast included, in Chromium at 360 px.
- **Design tokens (T.19):** Tailwind v4 CSS-first theme in `src/index.css` (`@theme`). The default palette and fonts are removed, so only white, grey, one accent and the status colours (green/amber/red, with backgrounds) exist, plus `--spacing-tap: 2.75rem` (44 px). The accent colour and the font are placeholders until the owner decides (OQ-13). Components are F1.1.
- **OpenAPI types:** `npm run api:types` reads `openapi/openapi.yaml` and writes `src/api/schema.gen.ts` (ignored by ESLint and Prettier). The location of the contract copy in this repo is a proposal; F1.4 confirms it when B1.3 publishes the contract.
- **MSW:** worker file `public/mockServiceWorker.js` is generated by `msw init` and committed (MSW's recommendation); regenerate it when MSW is updated. It is excluded from ESLint and Prettier.

## Appendix B: Glossary

Proposed wording. The documents use several words for the same thing. Use these terms in code, screens and documents once approved.

| Term | Meaning |
|---|---|
| Location | A place that holds stock: the central warehouse or a branch |
| Branch | A business location other than the warehouse |
| Product | The model-level record, for example "HP 250 G9" |
| Variant or SKU | A sellable configuration of a product, with its own price and stock |
| Item | Everyday word for a product or SKU. Avoid in technical names |
| Receipt or GRN | The goods received note for stock arriving at the warehouse |
| Dispatch | The warehouse sending stock to a branch |
| Transfer | Stock moving from one location to another. A dispatch is a warehouse-to-branch transfer |
| In transit | Stock that has left the sender and is not yet accepted by the receiver |
| Discrepancy | A difference between what was sent and what was accepted |
| Reversal | A new entry that cancels the effect of an earlier one without deleting it |
| Cancel | A sale undone with a reason (status Cancelled). "Void" is not used |
| Workspace | The part of the system a role works in after login (for example Warehouse) |
| Active branch | The branch the user is currently working in |
| Permanent branch | The branch a non-front-staff user belongs to |
| Super Admin | The role with full access. Written with a space |

## Appendix C: Source documents and precedence

Order of authority (decided by the owner on 2026-11-18): OVR, FE, BE and DEVOPS win. DET and SPEC are background and are kept in sync with them. This file and TASKS follow OVR, FE, BE and DEVOPS.

| Abbrev. | File | Date | Role in this file |
|---|---|---|---|
| OVR | [1-Overview-and-Sprints.md](docs/project/1-Overview-and-Sprints.md) | Undated | Current (decisions, contract, sprints) |
| FE | [2-Frontend-Requirements.md](docs/project/2-Frontend-Requirements.md) | Undated | Current |
| BE | [3-Backend-Requirements.md](docs/project/3-Backend-Requirements.md) | Undated | Current |
| DEVOPS | [4-DevOps-Requirements.md](docs/project/4-DevOps-Requirements.md) | 2026-11-17 | Proposed DevOps plan, not owner-approved |
| DET | [5-Detailed-Requirements.md](docs/project/5-Detailed-Requirements.md) | 11 November 2026 | Background, synced 2026-11-18 (barcodes deferred, no dates, sprint plan) |
| SPEC | [6-Functional-Workflow-Specification.md](docs/project/6-Functional-Workflow-Specification.md) | Undated, synced 2026-11-18 | Background, in sync. Source of workflows, stock movement rules and Django app layout |
| TASKS | [TASKS.md](TASKS.md) | 2026-11-17, synced 2026-11-18 | Task list for Sprints 1 to 9 and enforced rules, derived from the current documents |
| GAPS | [PROJECT_GAPS_AND_ACTIONS.md](docs/project/PROJECT_GAPS_AND_ACTIONS.md) | 2026-11-18 | Open decisions and gaps |

All documents were converted from PDF to Markdown on 2026-11-18. The original PDFs are kept in `_source-pdfs/`.

## Appendix D: Critical decisions

All critical gaps were decided by the owner on 2026-11-18 and development is authorised (TASKS rule 0.7). The answers, the remaining high and medium gaps, and the decision log are in [PROJECT_GAPS_AND_ACTIONS.md](docs/project/PROJECT_GAPS_AND_ACTIONS.md).

| Gap | Decision |
|---|---|
| GAP-C01 | Barcodes, labels, scanning and per-unit tracking are deferred |
| GAP-C02 | Stock at SKU-and-location level; ledger rows carry a stable source reference and line ID; unit link added later; no unit tables now |
| GAP-C03 | The 9-sprint plan in OVR, no calendar dates, sales in the MVP |
| GAP-C04 | OVR, FE, BE and DEVOPS win; DET and SPEC are background and kept in sync |
| GAP-C05 | Front staff pick any active branch; combined roles use a role switcher that changes the whole view |
| GAP-C06 | Permission matrix approved on Sprint 1 Day 1; per-person permissions granted by Super Admin from the user edit screen until Sprint 5 |
| GAP-C07 | Stock buckets and movements follow SPEC s11.2 |
| GAP-C08 | Basic dispatch shortfall resolution in the MVP, branch transfers in Sprint 4; any admin role resolves, front staff cannot |
