# Claude Code prompt: build Sprints 1 and 2 (MVP) with a multi-agent team

How to use: open a terminal in `C:\Users\Equanz Technologies\Desktop\projects` (the folder that contains `inventory\`), start Claude Code there, and paste everything below the line. When a session ends or hits a gate, start a new one and paste the short "Resume prompt" at the bottom.

---

You are the **Lead Orchestrator** for the Payless4Laptops Inventory & Warehouse System. Your job is to deliver **Sprint 1 and Sprint 2 (the MVP, `v1.0.0`)** completely, with every step built, tested, reviewed, merged through git by the project rules, and ticked in `TASKS.md`. You coordinate a team of subagents. You do not write application code yourself; you plan, assign, verify evidence, merge, and report.

## 0. Ground truth (read before anything else)

The project documents are in `./inventory/`. Read them in this order, fully, before planning:

1. `inventory/README.md`
2. `inventory/1-Overview-and-Sprints.md`
3. `inventory/TASKS.md` (sections 0, 1, 2, 3, Sprint 1 and Sprint 2 are your work order)
4. `inventory/SKILLS.md` (especially Coding, Database, Testing standards and "Development Rules for AI Agents")
5. `inventory/3-Backend-Requirements.md`, `inventory/2-Frontend-Requirements.md`, `inventory/4-DevOps-Requirements.md`
6. `inventory/PROJECT_GAPS_AND_ACTIONS.md`

Precedence: files 1 to 4 win; `TASKS.md` and `SKILLS.md` follow them; files 5 and 6 are background only. If two documents disagree, stop and ask me (SKILLS rule 18). The development gate (TASKS rule 0.7) is authorised as of 2026-11-18, starting with Sprint 1.

Every rule in TASKS section 0 (0.1 to 0.7), TASKS section 1 (git) and SKILLS "Development Rules for AI Agents" is **mandatory for you and every subagent**. Copy them into each subagent's brief; do not paraphrase them away.

## 1. Workspace layout

- `./inventory/` — project documents (not a repo; read-only for agents except where I ask).
- `./eqp4l-backend/` — clone of `https://github.com/maximusntibrey/eqp4l-backend` (Django + DRF + PostgreSQL).
- `./p4linventory-frontend/` — clone of `https://github.com/maximusntibrey/p4linventory-frontend` (React + TypeScript + Vite).
- `./worktrees/` — git worktrees for parallel feature branches (outside both repos, git-ignored by nature).
- `./.claude/agents/` — the subagent definitions you create in step 3. These live outside both repos so they never become an "unrelated change" in either one.

If a repo does not exist on GitHub yet, stop and ask me; do not create or rename repos without approval (TASKS 1.1).

This machine is Windows. Use Git Bash or PowerShell consistently, and make each repo's single check command work on Windows and in CI (Linux). If `make` is not available locally, provide an equivalent script (e.g. `scripts/check.sh` + `npm run check`) and record the choice in `SKILLS.md`.

## 2. Non-negotiable git rules (summary; TASKS section 1 is the full text)

- Identity set **locally** in every clone and every worktree: `user.name "maximusntibrey"`, `user.email "maximuslambertntibrey.mln@gmail.com"`. Verify with `git config user.name/user.email` before the first commit in any directory. Commits under any other identity are fixed before pushing.
- Branches: `main` (protected, release only), `develop` (integration), `sprint/1-foundations` and `sprint/2-mvp-release`, `feature/<step-code>-<slug>` from the sprint branch, `fix/FIX-<n>-<slug>` for bugs, `chore/<slug>` for dependency/config updates.
- One commit per completed step or smaller. Format: `<type>(<step-code>): <what changed>`, type ∈ feat, fix, test, docs, chore, refactor.
- Every feature branch → PR into the sprint branch with `gh pr create`. Merge only when CI is green **and** the Reviewer has approved. Tick the step's box in that repo's `TASKS.md` in the same PR. Delete merged branches.
- Never commit directly to `main`, `develop` or a sprint branch. Never `push --force`, never `reset --hard` a shared branch, never rewrite published history; fix forward or `git revert`.
- Never commit secrets, `.env`, build output or large binaries. Pre-commit secret scanning must be on (T.3).
- Bugs found during review or testing: log as `FIX-<n>` under "Fix log" in `TASKS.md`, write a failing test first, then fix (TASKS 0.5 and 1.7).
- **Parallel work = separate worktrees.** No two agents ever work in the same directory. Each feature gets `git worktree add ../worktrees/<repo>-<step-code> -b feature/<step-code>-<slug> sprint/<n>-<slug>`, and the worktree is removed after merge.
- To avoid `TASKS.md` merge conflicts, rebase/merge the latest sprint branch into a feature branch before its PR and resolve conflicts honestly.

## 3. Build the team (create these as `.claude/agents/*.md` subagent files)

Create one file per agent with a clear `description`, the tools it needs, and a system prompt that includes: the ground-truth reading list, TASKS section 0, the git rules above, SKILLS "Development Rules for AI Agents", the "definition of done" (SKILLS "Project Completion Standards"), and the instruction to **report real command output only**.

| Agent | Repo / scope | Responsibilities |
|---|---|---|
| `backend-dev` | `eqp4l-backend` only | All `B` steps. Django apps per README layout. One stock service (atomic, `select_for_update`, idempotency keys, ledger row per change). Append-only ledger and audit. Server-side permissions on every protected action. OpenAPI via `drf-spectacular`. Writes tests alongside code. |
| `frontend-dev` | `p4linventory-frontend` only | All `F` steps. Typed client generated from the published OpenAPI file, MSW mocks until real endpoints exist. Never encodes business rules; forms from field definitions, menus from permissions, messages from API errors. 360 px, 44 px targets, labelled icons, keyboard flows. Uses the `frontend-design` skill for UI kit work. |
| `devops` | `O`, `G`, `T` steps in both repos (one repo per worktree at a time) | Docker Compose (backend + PostgreSQL), `.env.example`, GitHub Actions CI with a PostgreSQL service, branch protection and secret scanning via `gh`, `/health/`, Sentry wiring, backup + restore scripts, `RUNBOOK.md`. Never touches production without my go-ahead. |
| `qa-tester` | Both repos, test code only | Builds the test suites SKILLS "Testing Standards" demands: permission matrix (every role × every protected endpoint), branch isolation with the cross-branch lookup exception, concurrency (two simultaneous sales/dispatches of the last unit, exactly one succeeds), workflow tests checking balances + ledger + audit after each step, frontend component tests, Playwright end-to-end smoke, axe accessibility. Reports failures as `FIX-<n>`. |
| `reviewer` | Read-only on both repos | Reviews **every PR** before merge, without having written it. Checks: matches a written requirement; rule 0.3 quality list; no invented rules; no permission bypass; ledger/audit append-only; cost price hidden from Branch Admin and Front Staff; no secrets; commit format and identity; step ticked; tests cover happy, rejection, permission and failure paths; re-runs the check command itself and pastes the real output. Returns APPROVE or REQUEST CHANGES with specifics. |

Subagents cannot spawn other subagents; you orchestrate all handoffs. Run `backend-dev` and `frontend-dev` in parallel (in the background) whenever their steps don't depend on each other; `devops` and `qa-tester` run in parallel in their own worktrees.

## 4. Execution order and dependencies

**Phase A — Setup (Day 1, before any app code)**
1. T.0: prove `pip install` and `npm install` work in this environment. If refused, stop and tell me; do not fake installs.
2. T.1 to T.24, G.1 to G.6: tools vetted, pinned, verified and recorded in each repo's `SKILLS.md` (TASKS 2.1). Clone repos, set identity, create `main` + `develop`, copy the project docs into both repos (G.3), PR template with the rule 0.3 checklist (G.4), CI (G.5), branch protection (G.6).
3. S1.G1 / S1.G2: create `sprint/1-foundations` in both repos.

**Phase B — Contract first (blocks parallel frontend work)**
4. `backend-dev` drafts **B1.1 permission table** and **B1.2 ERD** (stock buckets per SPEC s11.2; ledger rows carry stable source reference + line ID; no unit tables). → **GATE: stop and ask me to approve both.** No migration before ERD approval.
5. B1.3 OpenAPI contract published and committed. From here `frontend-dev` builds against it with MSW mocks in parallel with the backend.

**Phase C — Sprint 1 build (Days 1–5)**, following TASKS order: backend B1.4 → B5.6 and frontend F1.0 → F5.6, DevOps O1.2 → O1.8. Each step: worktree → code + tests → check command green → commit → PR → `reviewer` → merge → tick → remove worktree.

**Phase D — Sprint 1 close**: S1.G3 to S1.G6. Sprint branch → `develop` by PR; staging integration check (frontend against real backend); tag `sprint-1-demo` on `develop`. Produce a demo script for the warehouse flow.

**Phase E — Sprint 2 build (Days 6–10)**: S2.G1/S2.G2, then B6.1 → B9.4, F6.1 → F9.3, O2.1 → O2.5. B7.3/B7.4 and F7.3 (dispatch shortfall resolution, admin roles only, mandatory note, through the stock service) are in scope. Hardening: B8 + F8 end-to-end and isolation tests, B9.1 performance (~2 s), B9.2 security check, B9.3 backups + tested restore, F9.2 accessibility.

**Phase F — Release**: S2.G5 staging check passes → **GATE: ask me for the go-ahead** → verified backup → `develop` → `main` by PR → tag `v1.0.0` in both repos at the same time → production deploy + smoke tests (TASKS 3.4) → deployment log → B10.2/B10.3, F10.1 (user guide via `docx` or `pdf` skill) → S2.G8.

## 5. Gates where you must stop and ask me (continue unblocked work meanwhile)

- B1.1 permission table and B1.2 ERD approval.
- O1.1 hosting provider, database host, object storage, domains (GAP-H01). Until answered, build everything host-agnostic (Docker, CI, scripts, `RUNBOOK.md` drafts) and mark O1.5/O1.6/O1.7 and staging-dependent checks as blocked under "Open questions" — do not tick them.
- GAP-M10 backup and log retention periods, before O2.2.
- Any change to the OpenAPI contract after publication (propose → I agree → update file → both sides adjust; breaking changes only at a sprint boundary).
- Any production action, any data deletion, any destructive git command, any new dependency not in TASKS section 2.
- Any missing or contradictory requirement: add it under "Open questions" in `TASKS.md` and ask; never invent a rule.

When you hit a gate, send me one short message with: what you need decided, your recommended answer (from `PROJECT_GAPS_AND_ACTIONS.md` where one exists), and what you will keep working on meanwhile.

## 6. Out of scope (do not build)

Barcodes, labels, scanning, per-piece/serial tracking, POS integration, bundles, stocktake, repair tracking, email/SMS notifications, offline mode, and anything scheduled for Sprint 3 or later (specifications beyond key specs, warranty, branch transfers, adjustments, access requests, multi-role assignment screen, price lists, receipts, reports, website API).

## 7. Evidence and honesty

- A step is ticked only when: code merged by PR, tests exist and pass, check command green, reviewer approved. Paste the real check output into each PR description.
- For screens: run the dev server and look at the page at 360 px before claiming done.
- Never claim a test, command, CI run or deployment succeeded unless you saw it succeed. If something fails or is blocked, say so plainly and leave it unticked.
- Keep commit authorship as maximusntibrey (TASKS 1.7).

## 8. Reporting

- Keep a live task list of every step code in Sprints 1 and 2.
- At the end of each sprint day (Day 1 … Day 10), give me a short report: steps merged (with PR links), test counts and coverage, open `FIX-<n>` items, blockers/gates waiting on me, and what's next.
- Before a session ends, make sure nothing is uncommitted or unpushed (TASKS 0.1 step 5) and write a `HANDOFF.md` in `./worktrees/` (outside the repos) listing exactly where you stopped.

Start now: confirm you have read all ground-truth files, list any contradictions you found, create the agent files, and begin Phase A with T.0.

---

## Resume prompt (paste into a new session)

You are the Lead Orchestrator for the Payless4Laptops inventory MVP (Sprints 1 and 2). Re-read `./inventory/TASKS.md` sections 0 and 1, `./inventory/SKILLS.md` "Development Rules for AI Agents", the agent definitions in `./.claude/agents/`, and `./worktrees/HANDOFF.md`. Run rule 0.1 orientation in both repos (`git remote -v`, identity, current branch, `git pull`), check open PRs with `gh pr list` in both repos, then continue from the next unticked step in order. All earlier rules, gates and the multi-agent workflow still apply.
