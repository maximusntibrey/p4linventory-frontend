# DevOps Requirements

**Status:** Proposed, awaiting owner approval. Applies to both repos.

> **Document set.** [README](README.md) · [1 Overview and Sprints](1-Overview-and-Sprints.md) · [2 Frontend](2-Frontend-Requirements.md) · [3 Backend](3-Backend-Requirements.md) · [4 DevOps](4-DevOps-Requirements.md) · [TASKS](TASKS.md) · [SKILLS](SKILLS.md) · [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).

*Nov 17, 2026 · Maximus*

Everything needed to host, build, deploy, back up, watch and release the Inventory & Warehouse System for Payless4Laptops. It sits beside the Backend and Frontend documents: those say what the code does, this one says how it gets to users safely.

## 1. Decisions and shared rules

| # | Decision | Outcome |
|---|---|---|
| 1 | Stack | Django (backend) and React (frontend) |
| 2 | Repositories | `eqp4l-backend` and `p4linventory-frontend`, both under GitHub user `maximusntibrey`, deployed separately |
| 3 | Environments | local, staging, production |
| 4 | Path to production | Only through `main`, by version tag, after passing staging |
| 5 | Owner approval | The owner approves every production deployment and every production data change |
| 6 | Backups | A verified backup before every production deployment and migration |
| 7 | Rollback | Every release has a written rollback that was tried on staging |
| 8 | Secrets | Only in the host's secret store or environment variables, never in git |
| 9 | Dates | None attached to the plan. Work is tracked by sprint and day number |
| 10 | Time zone and currency | Africa/Accra, Ghana cedi (GHS) |

Items marked [NEW] elsewhere are not in the original specification. The hosting provider is not chosen yet: see section 12.

The same enforced rules for any AI or person, and the Fix log and Deployment log, live in the project's `TASKS.md`.

## 2. Environments

Three environments, each with its own database, secrets and domain. Staging mirrors production so a release behaves the same in both.

| Environment | Purpose | Deployed from | Approval |
|---|---|---|---|
| local | Daily development with Docker Compose (Django, PostgreSQL) and the Vite dev server | Any branch | None |
| staging | Integration check, end-to-end tests, migration rehearsal, demos to branch users | `develop`, automatically on merge | None |
| production | Real users and real data | `main`, by version tag only | Owner, every release |

- Staging uses the same database engine and settings as production. Only secrets, domains and data differ.
- Staging never holds real customer data. Use seed or masked data.
- Migrations always run on staging first. Never test a migration on production.
- Each environment has its own API keys and its own error-monitoring tag.
- `.env.example` in each repo lists every variable with a dummy value. The real `.env` is never committed.

## 3. Hosting and target architecture

The hosting provider is chosen by the owner in step O1.1. Whatever is chosen must provide the parts below.

| Component | Technology | Notes |
|---|---|---|
| Backend app | Django served by Gunicorn | Behind the host's HTTPS reverse proxy |
| Database | Managed PostgreSQL | Daily automated backups, same engine on staging |
| Frontend | React production build (static files) | Served by a static host or CDN over HTTPS |
| Images and documents | Object storage | Not the server disk. Included in backups |
| Scheduled jobs | Host scheduler or cron running Django management commands | Overdue transfer reminders, backups |
| Error monitoring | Sentry on backend and frontend | One environment tag per environment |
| Uptime check | External monitor on `/health/` and the frontend URL | Alerts the owner |
| Secrets | Host secret store or environment variables | Never in git |

Settings that must hold in staging and production:

- HTTPS only. Secure, HTTP-only cookies. Hashed passwords and login rate limiting stay on.
- CORS and CSRF allow only the frontend's own domains. Debug mode is off.
- The backend exposes `/health/`, which checks the app and the database connection.
- Time zone Africa/Accra. Timestamps are timezone-aware.
- The system is online-only for now. Offline mode is not planned.

## 4. Git, branching and release tags

The two repositories follow the same flow. Git identity is set locally in each repo: user `maximusntibrey`, email `maximuslambertntibrey.mln@gmail.com`.

| Branch | Purpose | Rules |
|---|---|---|
| `main` | Production-ready code, tagged per release | Protected. Pull request and green CI required. No direct commits, no force pushes |
| `develop` | Integration branch, deployed to staging | Protected in the same way |
| `sprint/<n>-<slug>` | One per sprint, branched from `develop` | Merged into `develop` at sprint end |
| `feature/<step-code>-<slug>` | One per step, branched from the sprint branch | Merged by pull request, then deleted |
| `fix/<ref>-<slug>` | Bug fixes | See section 10 |
| `chore/<slug>` | Dependency and configuration updates | See section 10 |
| `hotfix/<ref>-<slug>` | Urgent production fixes, branched from `main` | See section 10 |

Commit messages use `<type>(<step-code>): <what changed>`, with type `feat`, `fix`, `test`, `docs`, `chore` or `refactor`. One commit per completed step. Never commit secrets, `.env` files, build output or large binaries.

Release tags, applied to `main` in both repos at the same time:

| Tag | Release |
|---|---|
| `v1.0.0` | MVP (end of Sprint 2) |
| `v1.1.0` | Sprint 3 |
| `v1.2.0` | Sprint 4 |
| `v1.3.0` | Phase 1 complete (Sprint 5) |
| `v2.1.0` | Sprint 6 |
| `v2.2.0` | Sprint 7 |
| `v2.3.0` | Sprint 8 |
| `v2.4.0` | Phase 2 complete (Sprint 9) |

Patch releases use the third number (for example `v1.0.1`). Sprint 1 ends with a `sprint-1-demo` tag on `develop` and no release.

## 5. CI/CD pipelines

Every pull request runs the repo's one check command in CI and must be green before it can merge. Package installs in CI use pinned versions and the lockfiles.

| Pipeline | Runs | Checks |
|---|---|---|
| Backend CI (`eqp4l-backend`) | Every pull request | Lint and format (`ruff`), type check, security scan (`bandit`, `pip-audit`), tests against a real PostgreSQL service, missing-migration check |
| Frontend CI (`p4linventory-frontend`) | Every pull request | Lint, type check, unit and component tests, accessibility checks, production build, dependency audit |
| Staging deploy | Merge into `develop` | Migrations, deployment, then the smoke tests in section 9 |
| End-to-end tests | After a staging deploy | Login, pick a branch, add an item, receive, dispatch, receive at branch, sell, find |
| Production deploy | Version tag on `main`, after owner approval | Verified backup, migrations, backend, frontend, smoke tests |

The frontend CI uses mock responses (MSW) built from the OpenAPI contract. At the end of each sprint the frontend also runs against the real backend on staging.

The OpenAPI contract is generated by the backend and is the only link between the two pipelines. A pull request that changes it is flagged and follows the contract-change rule: propose, agree with the owner, update the contract file, then adjust both sides. Breaking changes happen only at a sprint boundary.

## 6. Database, migrations and storage

Stock balances and the stock ledger are the heart of the system, so database changes get the most care.

- **Migrations in git.** Every schema change is a Django migration committed with the code. An applied migration is never edited: add a new one instead.
- **Order of rollout.** Migration on staging, then a restore-and-rehearse check for risky ones, then production after a verified backup.
- **Risky migrations.** The product and variant split (Sprint 3) is rehearsed on a staging copy of production-like data, with the rollback tested, before it is merged.
- **Append-only data.** The audit trail and the stock ledger accept inserts only. No application role can update or delete them, and the database user the app connects with should not hold update or delete rights on those tables where the host allows it.
- **Stock changes.** Every stock change runs through one service with database transactions and row-level locking, plus idempotency keys to block duplicate submissions.
- **Least privilege.** The app's database user has only the rights it needs. Admin and migration credentials are separate and held by the owner.
- **Seed and import data.** Seed data (`SA-0001`, three branches, sample items) is for local and staging. Real data is loaded into production only through the opening-balance CSV import, which writes ledger movements, after the owner's go-ahead.
- **Images and documents.** Stored in object storage with enforced types and sizes. Removed from view, not deleted, once a product has history. Backed up with the database.

## 7. Backups and recovery

A backup that has never been restored is not a verified backup.

| What | When | Detail |
|---|---|---|
| Automated database backup | Daily | Scheduled from Sprint 2 (set up in O2.2, confirmed in B11.2) |
| Image and document storage backup | Daily | Same schedule as the database |
| Pre-deployment backup | Before every production deployment and migration | Verified and recorded in the deployment log |
| Restore test | Before the MVP release, after any major migration, and at the end of each phase | Done on staging. Result and recovery time are recorded |
| Retention period | To be confirmed by the owner | See section 12 |

Recovery steps, kept in `RUNBOOK.md` in the backend repo:

1. Stop writes by putting the system in maintenance mode.
2. Restore the latest good database backup into a new database, then the matching image storage.
3. Point the backend at the restored database and run the smoke tests.
4. Tell the owner what was lost, if anything, and the time covered.
5. Record the incident and the fix in the Fix log.

## 8. Monitoring, logging and security operations

- **Error monitoring.** Sentry on backend and frontend, tagged per environment. New errors after a release are checked for 15 minutes.
- **Uptime.** An external check on `/health/` and on the frontend URL, alerting the owner.
- **Logs.** Application and deployment logs are kept for a stated period (owner confirms). Logs never contain passwords, API keys, tokens or customer details.
- **Audit trail is separate.** The in-app audit trail (logins, switches, receipts, dispatches, sales, exports) is business data, not a log file, and is backed up with the database.
- **Dependency updates.** Arrive as pull requests, one dependency or group at a time, with the security scan re-run.
- **Secret scanning.** On in both repos. A leaked secret is rotated at once and recorded in the Fix log.
- **Access.** Production access is limited to the owner and anyone the owner names. Access changes are recorded.
- **Website API.** From Sprint 9: keys stored hashed, rate limits at the edge and in the app, and a check that no costs, customers or sales data can be reached.
- **Security reviews.** At the end of Sprint 2 (MVP endpoints), Sprint 5 (Phase 1), and Sprint 9 (Phase 2), covering secrets, access, HTTPS, CORS, headers and dependency audit.

## 9. Deployment procedure, smoke tests and rollback

Production release, in this order:

1. The sprint branch is merged into `develop` in both repos and the staging check passes.
2. The owner gives the go-ahead for the release.
3. A verified backup of the database and image storage is taken and logged.
4. `develop` is merged into `main` by pull request and the version tag is pushed in both repos.
5. Migrations run, then the backend deploys, then the frontend deploys.
6. The smoke tests below are run and their real results recorded.
7. Monitoring is watched for 15 minutes. A deployment log entry is written.
8. Release notes are written, and the docs and `SKILLS.md` are updated.

Smoke tests, run after every staging and production deployment:

| # | Check |
|---|---|
| 1 | `/health/` responds OK |
| 2 | Log in as the SuperAdmin |
| 3 | The dashboard and the item list open |
| 4 | The stock screen loads |
| 5 | A Find search returns results, with other branches showing name and quantity only |
| 6 | HTTPS, CORS and secure cookies are correct |
| 7 | No new errors in monitoring after 15 minutes |

**Rollback:** redeploy the previous tag in both repos. If the release changed the database, use the tested reverse migration, or restore from the pre-deployment backup. The rollback is rehearsed on staging before the first production deployment and before any release with a risky migration. If the rollback is not known to work, the release does not go ahead.

A deployment is never reported as done unless the smoke tests were run and passed.

## 10. Fixes, patches, updates and hotfixes

A fix, patch, dependency update or configuration change is real work and follows every rule above. No change goes straight onto `main`, `develop` or a sprint branch.

Rules for all of them:

- Every change has a reference: a step code, or a `FIX-<n>` entry in the Fix log recorded before work starts.
- A bug fix includes a test that fails before the fix and passes after it.
- The full check command is green before the pull request opens and before it merges.
- Changes to stock, ledger, permissions, audit, money or migrations also re-run the permission, branch-isolation and concurrency tests.
- History is never rewritten to hide a mistake. Fix forward, or use `git revert`.
- A change to the OpenAPI contract is never mixed with an unrelated fix, and creates the matching task in the other repo.

| Kind | Branch from | Branch name | Path to release |
|---|---|---|---|
| Normal fix | Sprint branch or `develop` | `fix/<ref>-<slug>` | Pull request, merged when CI is green, released with the sprint |
| Dependency or config update | `develop` | `chore/<slug>` | One dependency or group per branch, lockfile and `SKILLS.md` updated, security scan re-run |
| Hotfix (production broken or unsafe) | `main` | `hotfix/<ref>-<slug>` | Owner go-ahead, verified backup, pull request into `main`, patch tag, deploy, smoke tests |

After every hotfix, the same fix is merged back into `develop` and into the open sprint branch by pull request, so it is not lost. It is then recorded in the Fix log and the deployment log. Urgency never excuses skipping tests, review or the backup.

## 11. DevOps sprint plan

Each sprint is 5 working days and keeps 10 to 20% of the time free for bugs and feedback. DevOps steps are tracked as `O<sprint>.<n>` in `TASKS.md`. Every sprint also does its git steps for both repos, a backup check and a docs update. No dates are attached.

| Sprint | DevOps work | Release |
|---|---|---|
| 1 | O1.1 Owner chooses hosting, database, storage and domains. O1.2 Docker Compose and `.env.example` for local use. O1.3 and O1.4 backend and frontend CI. O1.5 staging environment with secrets. O1.6 automatic deploy of `develop` to staging with smoke tests. O1.7 `/health/` endpoint and Sentry on staging. O1.8 branch protection and secret scanning | None (demo tag `sprint-1-demo`) |
| 2 | O2.1 production environment (database, storage, HTTPS, domains, CORS, secure cookies). O2.2 automated daily backups. O2.3 restore test on staging. O2.4 rollback rehearsed and written into the runbook. O2.5 monitoring and uptime checks. O2.6 owner go-ahead, verified backup, deploy and smoke tests. O2.7 deployment log entry | `v1.0.0` (MVP) |
| 3 | O3.1 scheduled backups confirmed. O3.2 product and variant migration rehearsed on staging with rollback tested. O3.3 verified backup, deploy, smoke tests, log entry | `v1.1.0` |
| 4 | O4.1 scheduler for the overdue transfer reminder on staging and production. O4.2 concurrency tests at staging data volume. O4.3 verified backup, deploy, smoke tests, log entry | `v1.2.0` |
| 5 | O5.1 infrastructure security review. O5.2 restore test repeated. O5.3 performance check (search and product list within about 2 seconds). O5.4 verified backup, deploy, smoke tests, log entry | `v1.3.0` (Phase 1 complete) |
| 6 | O6.1 receipt print and share checked on real phones and a printer. O6.2 verified backup, deploy, smoke tests, log entry | `v2.1.0` |
| 7 | O7.1 concurrency and load check for simultaneous sales. O7.2 verified backup, deploy, smoke tests, log entry | `v2.2.0` |
| 8 | O8.1 report and CSV export run times and timeouts checked. O8.2 verified backup, deploy, smoke tests, log entry | `v2.3.0` |
| 9 | O9.1 website API exposure checks (key storage, rate limits, CORS, no costs or customer data). O9.2 final restore test with recovery time. O9.3 runbook reviewed. O9.4 owner go-ahead, verified backup, deploy, smoke tests, log entry. O9.5 infrastructure notes for POS integration (a later update, not scheduled) | `v2.4.0` (Phase 2 complete) |

## 12. Acceptance criteria and open questions

### MVP (end of Sprint 2)

- Staging and production exist, both reachable over HTTPS, with separate databases and secrets.
- Both repos have CI that blocks merges when the check command fails, and protected `main` and `develop` branches.
- `develop` deploys to staging automatically and the smoke tests pass.
- Daily backups run, and a restore from backup has been tested on staging.
- A rollback has been rehearsed on staging and is written in `RUNBOOK.md`.
- Monitoring and uptime checks are live on production.
- `v1.0.0` is deployed to production with the owner's go-ahead, a verified backup and passing smoke tests, and is recorded in the deployment log.

### Phase 1 complete (end of Sprint 5)

- Every release from `v1.1.0` to `v1.3.0` followed the full deployment procedure and has a deployment log entry.
- The overdue transfer reminder runs on a schedule in production.
- An infrastructure security review and a repeated restore test are done and recorded.

### Phase 2 complete (end of Sprint 9)

- Every release from `v2.1.0` to `v2.4.0` followed the full deployment procedure and has a deployment log entry.
- The website API is protected by keys and rate limits, and a check shows no costs, customer or sales data can be reached.
- The runbook is complete and a final restore test with its recovery time is recorded.

### Open questions for the owner

- Which hosting provider, database host, object storage and domain names to use (step O1.1)
- How long backups and logs are kept
- Package installs in the working environment: allow the package registries (PyPI, npm, GitHub) in the account's network settings, then open a new chat
- POS integration infrastructure is not scheduled and will be planned in a later update (Backend section 14)
