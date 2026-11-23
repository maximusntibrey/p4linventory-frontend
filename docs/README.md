# Inventory & Warehouse System

## Project Overview

A web system for Payless4Laptops that tracks inventory across one central warehouse and several branches, records stock movements and sales, and controls who can see and do what.

## Document Map

Every project document is a Markdown file in this folder. **Order of precedence (decided 2026-11-18):** files 1 to 4 win; files 5 and 6 are background and are kept in sync with them. `TASKS.md` and `SKILLS.md` follow files 1 to 4.

| File | What it covers | Status |
|---|---|---|
| [1-Overview-and-Sprints.md](1-Overview-and-Sprints.md) | Shared decisions, roles, the API contract, the 9-sprint plan and release tags | Current |
| [2-Frontend-Requirements.md](2-Frontend-Requirements.md) | Screens, look and feel, navigation, frontend tests and sprint plan (`p4linventory-frontend`) | Current |
| [3-Backend-Requirements.md](3-Backend-Requirements.md) | Data, rules, item specifications, APIs, security, backend sprint plan (`eqp4l-backend`) | Current |
| [4-DevOps-Requirements.md](4-DevOps-Requirements.md) | Environments, hosting, CI/CD, backups, monitoring, releases | Proposed, awaiting owner approval |
| [TASKS.md](TASKS.md) | Enforced rules, git workflow, and every step (`G`, `T`, `O`, `B`, `F`) for Sprints 1 to 9 | Current, derived from 1 to 4 |
| [SKILLS.md](SKILLS.md) | Technical standards, coding rules, AI agent rules, install register, glossary | Current, derived from 1 to 4 |
| [PROJECT_GAPS_AND_ACTIONS.md](PROJECT_GAPS_AND_ACTIONS.md) | Open decisions and gaps found across the documents, with recommended answers | Open items |
| [5-Detailed-Requirements.md](5-Detailed-Requirements.md) | Earlier detailed requirements (11 November 2026), synced: barcodes deferred, no calendar dates | Background, in sync |
| [6-Functional-Workflow-Specification.md](6-Functional-Workflow-Specification.md) | Original workflow specification: workflows, GRN and transfer fields, stock rules, Django app layout | Background, in sync |

## Business Objectives

- Know exactly how much of each item is at the warehouse and at each branch
- Move stock from the warehouse to branches, and later between branches, with a clear trail and handling of shortfalls
- Record sales so stock reduces automatically
- Give every action an owner, a time and a branch
- Show stock on the company website through a read-only API (Sprint 9)

## Technology Stack

**Backend:** Python with Django and Django REST Framework  
**Database:** PostgreSQL  
**Frontend:** React  
**Frontend tooling:** TypeScript, Vite, React Router, TanStack Query, react-hook-form with zod (proposed)  
**Styling and icons:** Tailwind CSS (proposed), Lucide icons  
**API style:** REST over JSON, versioned URLs, session-based login  
**API contract:** OpenAPI document published by the backend (generator `drf-spectacular`, proposed)

Approval status of each choice is in `SKILLS.md`, Technology Stack.

## Architecture

The project consists of two independent repositories with one OpenAPI contract:

- **`eqp4l-backend`:** Django REST API (business logic, validation, permissions)
- **`p4linventory-frontend`:** React frontend (UI, navigation, API consumption)

Both live under the GitHub user `maximusntibrey` and are built and deployed separately. The OpenAPI document is the only link between the two repositories, ensuring consistency and preventing duplication of business rules.

## Development Approach

1. **Two independent repositories** - Backend and frontend are separate projects
2. **Backend owns business logic** - All validation, permissions, and data operations happen in Django
3. **Frontend depends on backend API** - React components built from API field definitions
4. **Mock responses first** - Frontend development starts with mock responses until real backend exists
5. **API contract first** - OpenAPI document published before frontend development

## Key Features

### User Roles and Permissions

- **Super Admin:** Full access to everything, every branch
- **Warehouse Admin:** Items, receipts, dispatch, sees cost
- **Branch Admin:** Runs a branch, receives, sells, cancels sales, no cost
- **Front Staff:** Sells, finds items, receives where permitted, no cost

### Core Operational Processes

1. **Warehouse Receiving:** Receive stock at the warehouse (MVP)
2. **Dispatch:** Send to a branch (MVP)
3. **Branch Receiving:** Receive at the branch: all, part or none (MVP)
4. **Shortfall Resolution:** Handle missing stock (dispatch shortfalls in the MVP, branch transfers from Sprint 4)
5. **Sales:** Record sales with automatic stock deduction (MVP)
6. **Reversals:** Cancel in the MVP; void, refund and exchange from Sprint 7
7. **Adjustments:** Handle damaged, expired, counted items (Sprint 4)
8. **Branch Transfers:** Move stock between branches (Sprint 4)
9. **Cross-Branch Lookup:** View other branches' quantities (MVP)
10. **CSV Import:** Import opening stock from CSV (MVP)

## Repository Structure

Each repository is separate. The layouts below are the planned top level of each.

```
eqp4l-backend/                   # Django REST API
├── eqp4l/                       # Django project settings
├── accounts/                    # Users, login IDs, authentication
├── roles/                       # Roles, permissions, default workspace
├── branches/                    # Branch locations
├── branch_access/               # Temporary branch access requests, switch log
├── inventory/                   # Products, variants, categories, specifications, stock balances
├── warehouse/                   # Suppliers and goods receipts (GRN)
├── transfers/                   # Dispatches, branch transfers, receiving, discrepancies
├── sales/                       # Sales, payments, customers, receipts
├── stock_ledger/                # Append-only stock movement records
├── approvals/                   # Approval requests and decisions
├── notifications/               # In-app notifications
├── reports/                     # Dashboards, reports, exports
├── audit/                       # Append-only audit trail
├── README.md, SKILLS.md, TASKS.md, RUNBOOK.md, .env.example
├── requirements.txt
└── pyproject.toml

p4linventory-frontend/           # React app
├── src/
│   ├── components/              # Shared UI kit
│   ├── pages/                   # Feature folders: sell, receiving, items, users, ...
│   └── services/                # Generated API client
├── public/                      # Static assets
├── README.md, SKILLS.md, TASKS.md, .env.example
└── package.json, vite.config.ts
```

The project documents in this folder are copied into both repos (step G.3 in `TASKS.md`).

## Getting Started

### Prerequisites

- Git 2.29 or higher
- Python 3.12+ (for backend)
- Node.js LTS (for frontend)
- Docker and Docker Compose (local backend and PostgreSQL)

### Setup

1. **Clone both repositories**:
   ```bash
   git clone https://github.com/maximusntibrey/eqp4l-backend.git
   git clone https://github.com/maximusntibrey/p4linventory-frontend.git
   ```

2. **Set up git identity** in each repository (locally, never globally):
   ```bash
   git config user.name "maximusntibrey"
   git config user.email "maximuslambertntibrey.mln@gmail.com"
   ```

3. **Backend setup** (`eqp4l-backend`):
   - Copy `.env.example` to `.env` and fill in local values (never commit `.env`)
   - Start PostgreSQL with the repo's Docker Compose file (step O1.2)
   - Install Python dependencies, run migrations, load seed data
   - Start the Django server

4. **Frontend setup** (`p4linventory-frontend`):
   - Copy `.env.example` to `.env`
   - Install Node.js dependencies
   - Generate the API client from the OpenAPI contract
   - Start the Vite development server

The Docker Compose file for local work lives in `eqp4l-backend` and runs Django and PostgreSQL. The frontend runs with the Vite dev server (DevOps section 2). Passwords and secrets come from `.env`, never from the compose file.

## Development Workflow

| Sprint | Days | Goal | Release |
|---|---|---|---|
| 1 | 1 to 5 | Setup, login, users and branches, items and stock, warehouse flow | `sprint-1-demo` (no release) |
| 2 | 6 to 10 | Sales, find, CSV import, dashboard and activity log, hardening, deployment | `v1.0.0` (MVP) |
| 3 | 11 to 15 | Fixes from real use, laptop, parts and accessory specifications, product and variant split | `v1.1.0` |
| 4 | 16 to 20 | Branch-to-branch transfers, adjustments and reversals, notifications | `v1.2.0` |
| 5 | 21 to 25 | Branch access requests, multi-role assignment, price history, activity screens, security review | `v1.3.0` (Phase 1 complete) |
| 6 | 26 to 30 | Price lists, branch overrides, discounts, receipts, customer details | `v2.1.0` |
| 7 | 31 to 35 | Split payments, daily close, returns and refunds, sales history, role dashboards | `v2.2.0` |
| 8 | 36 to 40 | Reports and exports | `v2.3.0` |
| 9 | 41 to 45 | Website API, inspection and grading, warranty terms, supplier records | `v2.4.0` (Phase 2 complete) |

No calendar dates are attached. Each sprint ends with the frontend running against the real backend on staging. The step-by-step list is in `TASKS.md`.

## Testing

Run tests for both repositories with the repo's single check command (lint, type check, security scan, tests, build):

**Backend tests:**
```bash
cd eqp4l-backend
echo "Waiting for PostgreSQL..."
while ! pg_isready -h localhost -p 5432; do
    sleep 1
done
make check    # or pytest for tests only
```

**Frontend tests:**
```bash
cd p4linventory-frontend
npm run check  # or npm test for tests only
```

**Smoke tests (after every staging and production deployment, DevOps section 9):**
1. `/health/` endpoint responds OK
2. Log in as SuperAdmin
3. Open dashboard and item list
4. Stock screen loads
5. Find search returns results, with other branches showing name and quantity only
6. HTTPS, CORS and secure cookie settings are correct
7. No new errors in monitoring after 15 minutes

## Key Rules

1. **Two repositories only** - One frontend, one backend
2. **Backend owns business logic** - Never duplicate rules in frontend
3. **API contract is sacred** - Breaking changes only at sprint boundaries
4. **Append-only history** - No deleting transactions, only adding corrections
5. **Row-level locking** - Single stock service for all operations
6. **Permission enforcement** - Server-side checks for every protected action
7. **Cost visibility** - Only SuperAdmin and Warehouse Admin see costs
8. **Audit trail** - Every action logged with full context
9. **Development gate** - No application code until the owner authorises development (`TASKS.md` rule 0.7)

## Issues and Known Limitations

- **Not scheduled:** Barcodes, labels, scanning, per-piece records and serials, POS integration, bundles, stocktake, repair tracking, email/SMS notifications, offline mode (Backend section 14)
- **Open decisions:** listed in `PROJECT_GAPS_AND_ACTIONS.md`. All critical gaps (GAP-C01 to GAP-C08) were answered on 2026-11-18 and development is authorised
- **Hosting provider choice:** Owner to decide in Sprint 1 (step O1.1)

## Support

For questions or issues, refer to the project documents in the Document Map above and review `SKILLS.md` for technical standards and conventions.
