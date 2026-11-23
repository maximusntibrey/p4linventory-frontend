# Overview and Sprints

**Status:** Current. Shared decisions, contract and sprint plan.

> **Document set.** [README](README.md) · [1 Overview and Sprints](1-Overview-and-Sprints.md) · [2 Frontend](2-Frontend-Requirements.md) · [3 Backend](3-Backend-Requirements.md) · [4 DevOps](4-DevOps-Requirements.md) · [TASKS](TASKS.md) · [SKILLS](SKILLS.md) · [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).

This document describes the Inventory & Warehouse System for Payless4Laptops. It is split into separate files ("tabs") so the frontend and backend teams can work completely independently:

- **Overview and sprints** (this file): shared decisions, the contract between the two sides, and the sprint plan.
- **Frontend** ([2-Frontend-Requirements.md](2-Frontend-Requirements.md)): everything the user sees and does.
- **Backend** ([3-Backend-Requirements.md](3-Backend-Requirements.md)): everything the server does.
- **DevOps** ([4-DevOps-Requirements.md](4-DevOps-Requirements.md)): how the code is hosted, deployed, backed up and released.
- **Tasks** ([TASKS.md](TASKS.md)): the step-by-step task list and enforced rules, derived from the files above.

## 1. Decisions made

| # | Decision | Outcome |
|---|---|---|
| 1 | Branch access | Front staff can work at any branch. After login they pick the branch they are working in, and every screen then uses that branch's data. Other users have one permanent branch and need an approved request for temporary access elsewhere. |
| 2 | Login IDs and roles | Super Admins have their own ID format (for example SA-0001). Every other user has a unique neutral ID (for example USR-0001). Only Super Admins can assign more than one role to a user. Super Admins can do everything any user can do, in every branch. |
| 3 | Approving your own work | Super Admins can approve their own requests, and each self-approval is flagged in the audit trail. All other users cannot approve their own requests. |
| 4 | Barcodes and POS | Barcodes, labels, scanning and POS integration are left out for now and will be added in a later update. |
| 5 | Stock counting | Stock is counted as a quantity per item at each location (the warehouse and each branch). Individual pieces are not tracked in this version. |
| 6 | Sales | Users record sales in the system by selecting items. A simple version is part of the MVP, and it is built up in later sprints. |
| 7 | Cost and price | Cost price is visible to Super Admin and Warehouse Admin only. Selling price is set by Super Admin, or by a role granted the "manage prices" permission. |
| 8 | Item specifications | Full laptop, part and accessory specifications are captured, introduced over the sprints. |
| 9 | Interface | Very minimalist, with simple icons and the same simple layout for every role. |
| 10 | Sprints | Each sprint is 5 working days of 6 working hours. The MVP is built in the first two sprints and released at the end of Sprint 2 (day 10). |
| 11 | Scope kept | Cross-branch stock lookup, website API, CSV import with opening balances, price list, discounts, receipts, daily cash-up, warranty terms and used-laptop grading (recorded per receipt line) are in scope, in the sprints below. |
| 12 | Combined roles | A user with more than one role gets a role switcher. Switching changes the whole view (menu, home dashboard and screens) to the selected role's view. Every action records the role used. |
| 13 | Resolving shortfalls | Any admin role (Super Admin, Warehouse Admin, Branch Admin) can resolve a shortfall, within the branches they are allowed to act in. Front staff cannot. Basic resolution (return to sender, confirm loss, record damage) is part of the MVP. |
| 14 | Sale status words | Completed, Cancelled, Refunded and Exchanged. "Voided" is not used. |
| 15 | Per-person permissions | The permission matrix is approved on Sprint 1 Day 1. Until the role assignment screen (Sprint 5), a Super Admin grants per-person permissions such as Receive stock from the user edit screen. |
| 16 | Development gate | No application code is written until the owner authorises development after the critical gaps are answered (TASKS rule 0.7). |

### Assumptions confirmed

- **Condition and grade scale:** New, Refurbished and Used, with grade A, B or C.
- **Pricing:** one price list with an optional branch override, and cost visible to Super Admin and Warehouse Admin only.
- **Who confirms receipt at a branch:** Branch Admin plus front staff who hold the Receive stock permission, granted per person by a Super Admin.
- **Payments, receipts and taxes:** cash, mobile money, card and split payments, with printed and digital receipts. How taxes and levies appear on receipts is to be confirmed with an accountant before the receipt format is finalised.
- **Connectivity:** the system is online-only for now. Offline mode can be revisited if outages are frequent.

## 2. Roles at a glance

- **Super Admin:** everything, in every branch. Manages users, roles, branches and prices.
- **Any admin role** (Super Admin, Warehouse Admin, Branch Admin) can resolve shortfalls.
- **Warehouse Admin:** manages items, receives stock into the warehouse and dispatches it to branches. Sees cost price.
- **Branch Admin:** runs a branch. Receives stock, sells, cancels sales and sees branch stock. Does not see cost price.
- **Front Staff:** sells, finds items and, where permitted, receives stock. Does not see cost price.
- **Cross-branch lookup:** any user can see other branches' quantity for an item (branch name and quantity only).

How the rules are enforced is in the Backend tab. How the screens look is in the Frontend tab.

## 3. The contract between Frontend and Backend

- One API contract (an OpenAPI document) is the only link between the two sides. The Backend publishes it first. The Frontend builds against it using mock responses until the real endpoints are ready.
- The Frontend never hard-codes business rules. Item forms are built from field definitions the Backend returns for each category. Menus and buttons are built from what the user is permitted to do. Messages come from the Backend's error responses.
- The Backend never depends on how screens look. Responses carry data and plain-language errors that name the field at fault.
- Shared conventions: one error format, paginated lists, session-based login, versioned URLs.
- Changing the contract: propose, agree, update the contract file, then both sides adjust. Breaking changes happen only at a sprint boundary.
- Integration check: each sprint ends with the Frontend running against the real Backend on a staging environment.

## 4. Sprint structure

Each sprint is 5 working days. The first day starts with a short planning session, and the last day ends with a demo to branch users and a short review. Each team keeps its own sprint plan in its own tab. Every sprint includes tests, a security check on new features, a backup check and updated docs, and keeps 10 to 20% of the time free for bugs and feedback.

| Sprint | Days | Goal | Release |
|---|---|---|---|
| 1 | 1 to 5 | MVP, part 1: setup, login, users and branches, items and stock, warehouse flow (receive, dispatch, branch receiving) | None (tag `sprint-1-demo`) |
| 2 | 6 to 10 | MVP, part 2: sales, find, CSV import, dashboard and activity log, basic shortfall resolution for dispatches, testing, hardening and deployment | MVP, `v1.0.0` (day 10) |
| 3 | 11 to 15 | Fixes from real use, laptop, parts and accessory specifications, warranty terms, product and variant split, several images and spec sheets per product | `v1.1.0` |
| 4 | 16 to 20 | Branch-to-branch transfers, stock adjustments and reversals, notifications | `v1.2.0` |
| 5 | 21 to 25 | Branch access requests, multi-role assignment, price history, activity screens, security review and hardening | `v1.3.0`, Phase 1 complete |
| 6 | 26 to 30 | Selling, part 1: price lists, branch overrides, discounts, receipts, customer details | `v2.1.0` |
| 7 | 31 to 35 | Selling, part 2: split payments, daily close, returns and refunds, sales history, role dashboards, hardening | `v2.2.0` |
| 8 | 36 to 40 | Reports and exports | `v2.3.0` |
| 9 | 41 to 45 | Website API, inspection and grading per receipt line, supplier records, hardening | `v2.4.0`, Phase 2 complete |

Phase 1 is Sprints 1 to 5, and the MVP is its first two sprints. Phase 2 is Sprints 6 to 9. Release tags follow DevOps section 4 and are applied to `main` in both repos at the same time.

Later, not scheduled: barcodes and labels, scanning, per-piece records and serial numbers, POS integration, bundles, stocktake workflow, repair tracking, and email or SMS notifications (see Backend section 14).

### Things to watch

- The MVP uses all of Sprints 1 and 2. Sprint 1 ends with a working warehouse flow to demo rather than a release, and the MVP is released at the end of Sprint 2 (day 10).
- Because the MVP takes two sprints, Phase 1 ends at day 25 and Phase 2 at day 45.
- Sprints 3 and 4 are the heaviest. Anything that slips moves to the next sprint, not into its last day.
- Start preparing your product list for the CSV import early, because it usually takes longer than expected.
