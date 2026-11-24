# SKILLS.md: Technical Reference for the Inventory & Warehouse System

> **Document set.** [README](README.md) · [1 Overview and Sprints](1-Overview-and-Sprints.md) · [2 Frontend](2-Frontend-Requirements.md) · [3 Backend](3-Backend-Requirements.md) · [4 DevOps](4-DevOps-Requirements.md) · [TASKS](TASKS.md) · [SKILLS](SKILLS.md) · [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).
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
15. **Follow the git rules** in TASKS.md section 1: identity, branches, one commit per step, pull requests, no force pushes. Fixes, patches and updates follow section 1.7. _(Applied in the end-of-day cycle (owner, 2026-11-23))_
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

One register per repository. Record every tool, package and skill installed. Nothing is installed without vetting (TASKS.md 2.1). Frontend packages were registered in the Day 1 end-of-day cycle (FIX-2, 2026-11-23).

| Date | Repo | Name | Version | Purpose | Vetted by | Notes |
|---|---|---|---|---|---|---|
| 2026-11-23 | p4linventory-frontend | @eslint/js | 9.39.5 | ESLint core rules (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @fontsource/bebas-neue | 5.3.0 | Self-hosted Bebas Neue (display font, CLAUDE.md decision) | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @fontsource/inter | 5.3.0 | Self-hosted Inter (body font, CLAUDE.md decision) | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @playwright/test | 1.65.1 | End-to-end and 360 px layout tests | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @tailwindcss/vite | 4.3.5 | Tailwind Vite plugin (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @tanstack/react-query | 5.108.4 | Server-state cache for API calls | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @testing-library/react | 16.3.3 | Component tests | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @types/node | 26.6.6 | Node types for config and scripts (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @types/react | 19.3.0 | React types (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @types/react-dom | 19.3.0 | React DOM types (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | @vitejs/plugin-react | 6.3.0 | Vite React plugin (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | axe-core | 4.14.1 | Accessibility engine used by vitest-axe | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | eslint | 9.39.5 | Linting | Day 1 end-of-day cycle; npm audit (high+) in check | Owner approved 2026-11-23: deprecated 9.39.5 accepted until eslint-plugin-jsx-a11y supports ESLint 10. Exact version pinned. |
| 2026-11-23 | p4linventory-frontend | eslint-plugin-jsx-a11y | 6.10.2 | Accessibility lint rules | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | eslint-plugin-react-hooks | 7.1.1 | Hooks lint rules (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | globals | 17.14.0 | Global names for ESLint (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | jsdom | 31.0.1 | DOM for Vitest (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | lucide-react | 1.78.0 | The one icon set (every icon has a text label) | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | msw | 3.0.7 | Mock API from the contract (mock mode and tests); dev only, never in production output | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | openapi-typescript | 7.13.0 | Generates the typed client and runs the drift check | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | prettier | 3.10.1 | Formatting | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | react | 19.3.1 | UI library | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | react-dom | 19.3.1 | React DOM renderer | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | react-hook-form | 7.92.0 | Forms | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | react-router-dom | 7.18.6 | Routing | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | tailwindcss | 4.3.5 | Styling with the orange accent tokens | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | typescript | 5.9.3 | Type checking | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | typescript-eslint | 8.73.0 | TypeScript lint rules (supporting) | Day 1 end-of-day cycle; npm audit (high+) in check | Supporting package; owner approved 2026-11-23 (TASKS decision log). Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | vite | 8.3.8 | Dev server and build | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | vitest | 5.1.1 | Unit and component test runner | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | vitest-axe | 0.1.0 | Accessibility assertions in tests | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-23 | p4linventory-frontend | zod | 4.6.7 | Client-side input validation (hints only; the server decides) | Day 1 end-of-day cycle; npm audit (high+) in check | In TASKS section 2 list. Exact version pinned in package.json and lockfile. |
| 2026-11-24 | p4linventory-frontend | (none) | n/a | Day 3 F3.1 to F3.4 installed no package | `npm audit` 0 vulnerabilities in check | Built with react-query, react-hook-form, lucide-react, msw and Playwright already registered above. |

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
| OVR | [1-Overview-and-Sprints.md](1-Overview-and-Sprints.md) | Undated | Current (decisions, contract, sprints) |
| FE | [2-Frontend-Requirements.md](2-Frontend-Requirements.md) | Undated | Current |
| BE | [3-Backend-Requirements.md](3-Backend-Requirements.md) | Undated | Current |
| DEVOPS | [4-DevOps-Requirements.md](4-DevOps-Requirements.md) | 2026-11-17 | Proposed DevOps plan, not owner-approved |
| DET | [5-Detailed-Requirements.md](5-Detailed-Requirements.md) | 11 November 2026 | Background, synced 2026-11-18 (barcodes deferred, no dates, sprint plan) |
| SPEC | [6-Functional-Workflow-Specification.md](6-Functional-Workflow-Specification.md) | Undated, synced 2026-11-18 | Background, in sync. Source of workflows, stock movement rules and Django app layout |
| TASKS | [TASKS.md](TASKS.md) | 2026-11-17, synced 2026-11-18 | Task list for Sprints 1 to 9 and enforced rules, derived from the current documents |
| GAPS | [PROJECT_GAPS_AND_ACTIONS.md](PROJECT_GAPS_AND_ACTIONS.md) | 2026-11-18 | Open decisions and gaps |

All documents were converted from PDF to Markdown on 2026-11-18. The original PDFs are kept in `_source-pdfs/`.

## Appendix D: Critical decisions

All critical gaps were decided by the owner on 2026-11-18 and development is authorised (TASKS rule 0.7). The answers, the remaining high and medium gaps, and the decision log are in [PROJECT_GAPS_AND_ACTIONS.md](PROJECT_GAPS_AND_ACTIONS.md).

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

## DECISION LOG (working copy)

| Date | Decision | By |
|---|---|---|
| 2026-11-23 | No git workflow DURING a day: no branches, PRs or worktrees while building. Git runs only in /sync, the END-OF-DAY CYCLE, /emergency-push, or when the owner says "push". TASKS 0.1 steps 2-3, the git parts of 0.5, section 1, the G and S*.G steps, and SKILLS rule 15 apply there. They are marked "Applied in the end-of-day cycle (owner, 2026-11-23)" and are not deleted. Everything else stays in force: scope, quality, testing, security, honesty, gates, stock/ledger/audit/permission rules, accessibility, and "done only with evidence". | Owner |
| 2026-11-23 | B1.1 permission table (eqp4l-backend/docs/design/PERMISSION_TABLE.md) approved. | Owner |
| 2026-11-23 | B1.2 ERD (eqp4l-backend/docs/design/ERD.md) approved, including new tables idempotency_keys and dispatch_resolutions. | Owner |
| 2026-11-23 | OQ-4 to OQ-19: proposed answers approved as written. | Owner |
| 2026-11-23 | Frontend supporting packages approved: @vitejs/plugin-react, @tailwindcss/vite, jsdom, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals, @types/react, @types/react-dom, @types/node. eslint 9.39.5 (deprecated) accepted until eslint-plugin-jsx-a11y supports ESLint 10. | Owner |
| 2026-11-23 | GAP-M10 / OQ-3: keep local zip snapshots for the whole project; database backup retention decided when hosting (O1.1) is chosen. | Owner |
| 2026-11-23 | FIX-4 approved: Idempotency-Key on every state-changing request (not only the 3 stock POSTs). Contract becomes v0.1.1. | Owner |
| 2026-11-23 | FIX-5 approved: snake_case status codes in the database and API, mapped 1:1 to the SKILLS status words shown on screens; account status 'Pending activation' (pending_activation) added. Contract v0.1.1. | Owner |
| 2026-11-23 | OQ-20 approved: Super Admin and Warehouse Admin can add, rename and deactivate brands (seeded list; endpoints in v0.1.1); image limit 5 MB, JPEG/PNG/WebP; Discontinued is final (no re-activation); dashboard shell fields as in the contract. | Owner |
| 2026-11-23 | OQ-21 approved: an item can be activated without a selling price, but cannot be sold until a price exists; only Super Admin or a 'Manage prices' holder may send selling_price. | Owner |
| 2026-11-23 | OQ-22 approved: an account created (or reset) by a Super Admin starts as pending_activation and becomes active after the user's first password change; pending_activation is set only by the system, never via the status endpoint. | Owner |
| 2026-11-23 | Brands: a deactivated brand can be reactivated (SA or WA) and cannot be chosen for new items (400). | Owner |
| 2026-11-24 | OQ-23 approved: add permission and menu codes for Sell, Activity, Find and Receive to the contract with B3.4 (dashboard shell), so Super Admin Home opens them from server data. | Owner |
| 2026-11-24 | Contract v0.1.2 approved: a generic `conflict` error code (409) used for duplicate stock posts instead of idempotency_conflict, and the 429 response documented on /auth/password/. Publish at the start of Day 3; the frontend re-syncs. | Owner |
| 2026-11-24 | Super Admin and branches: a Super Admin is never asked to pick a branch at login. Super Admin works across ALL branches: lists and dashboard default to all branches, with an optional branch filter to view one branch, and every action available to them can be performed on any branch (actions on a record use that record's location, OQ-12). /me exposes `must_pick_branch` (true only when the user's role requires a working branch and none is chosen; always false for Super Admin). | Owner |
| 2026-11-24 | Contract v0.1.2 also approved: /me `home_links` (Sell, Activity, Find, Receive Home tiles, separate from the max-5 menu) and /me `can_assign_multiple_roles` (true only for Super Admin). | Owner |
| 2026-11-24 | OQ-26 decided: (1) Deactivated is final (suspend for temporary cases). (2) Last-Super-Admin guard: the system must always keep at least one active Super Admin; removing the SA role from, suspending or deactivating the last active SA is refused. (3) A Branch Admin's user list includes users whose permanent branch is theirs AND Front Staff currently working at their branch. (4) Password reset is refused for a deactivated user. | Owner |
| 2026-11-24 | OQ-25 (backend) decided: Warehouse Admin and Branch Admin open the Activity log from a Home tile (home_links), showing only their own location's activity (OQ-5). | Owner |
