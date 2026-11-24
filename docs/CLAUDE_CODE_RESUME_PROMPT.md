# Claude Code resume prompt: rebuild state, then continue Sprints 1–2 on a token budget

How to use: start a **fresh** Claude Code session in `Desktop\projects`, paste everything below the line. Later sessions: paste only the "Next-session prompt" at the bottom.

---

You are the Lead Orchestrator for the Payless4Laptops inventory MVP (Sprints 1–2). The previous session ended **without a handoff**, so first rebuild the true state from git and GitHub, then continue. Work under a strict **token budget**: maximum results, minimum reading and chatter.

## Token rules (apply to you and every subagent)

1. **Never read whole documents.** `TASKS.md` and the requirements files are large. Use `grep -n` to find the step or section, then read only that range (`Read` with offset/limit). Read a requirement section only when building the step that needs it.
2. **One state file is the memory:** `./.claude/STATE.md` (outside both repos). Read it at the start of every session and every subagent task instead of re-deriving context. Keep it under ~80 lines.
3. **Quiet commands, tail on failure.** Run tests and checks with quiet flags (`pytest -q`, `vitest run --reporter=dot`, `ruff --quiet`) and show only the summary line. On failure show only the failing test names and the last ~30 lines. Never paste full logs, full diffs or full files into chat.
4. **Fewer, longer-lived agents.** At most **2 subagents running at once**. Hand each a small brief: step codes, file paths, which doc sections to grep, and "read `.claude/STATE.md` first". Do not paste rules or docs into briefs; point to them by path and section.
5. **Right-size models.** In `.claude/agents/*.md` set `model: sonnet` for `backend-dev`, `frontend-dev`, `devops`, `qa-tester` and `reviewer`. Use `model: haiku` for any read-only lookup or recon helper. Keep yourself as the only agent doing planning.
6. **Group small steps.** TASKS 1.3 allows a feature branch per "step or small group of steps". Group tightly related steps (e.g. B2.2–B2.3, F4.1–F4.3) into one branch and one PR, with **one commit per step** inside it and every step ticked in that PR.
7. **Review the diff, not the repo.** The reviewer reads `gh pr diff <n>` plus only the files the diff touches, re-runs the check command, and replies in ≤15 lines: APPROVE or REQUEST CHANGES with a list.
8. **Short reports.** Subagents return ≤10 lines: steps done, PR number, check result (one line), blockers. Your daily report to me is ≤15 lines.
9. **Compact proactively.** After each merged PR group, update `STATE.md`; when the context gets long, run `/compact` with "keep STATE.md content and current step".

## Rules that do not change

Everything in `inventory/TASKS.md` sections 0 and 1 and `inventory/SKILLS.md` "Development Rules for AI Agents" still applies: local git identity (maximusntibrey), branch model, commit format `<type>(<step-code>): …`, PRs into the sprint branch, CI green + reviewer approval before merge, tick in the same PR, no force pushes or history rewrites, append-only ledger and audit, server-side permissions, no secrets, no invented rules, real output only. Gates still stop you: B1.1/B1.2 approval, O1.1 hosting, GAP-M10 retention, contract changes, anything touching production. Grep these sections when you need the exact wording; don't reload them in full.

## Step 1 — Recon (cheap, read-only, no code changes)

Run these and summarise; do not dump raw output into chat:

- In each repo (`eqp4l-backend`, `p4linventory-frontend`):
  `git fetch --all --prune -q` · `git status -sb` · `git branch -a` · `git stash list` · `git worktree list` · `git log --oneline -15 origin/develop` and the same for each `origin/sprint/*` branch · `git config user.name; git config user.email`
- `gh pr list --state all --limit 60 --json number,title,state,headRefName,baseRefName,mergedAt` (both repos)
- `gh run list --limit 10 --json name,status,conclusion,headBranch` (both repos)
- Ticked steps: `grep -nE "^- \[x\]" TASKS.md` in each repo's sprint branch (`git show origin/sprint/<n>-<slug>:TASKS.md | grep ...`)
- `ls ./worktrees` and, for each worktree, `git -C <path> status -sb` and `git -C <path> log --oneline -3`
- `ls ./.claude/agents` and whether `./worktrees/HANDOFF.md` or `./.claude/STATE.md` exists
- "Open questions" and "Fix log" at the bottom of each repo's `TASKS.md` (grep the headings, read only those sections)

## Step 2 — Reconcile (truth = merged code, not ticks)

For every Sprint 1–2 step code, decide one status:

| Status | Meaning | Action |
|---|---|---|
| DONE | Merged into the sprint branch by PR, ticked, tests present | none |
| MERGED-UNTICKED | Merged but box not ticked | verify tests exist and the check command passes, then tick in a small `docs(<code>)` PR |
| TICKED-NOT-MERGED | Ticked but code not on the sprint branch | untick in a `docs` PR; treat as TODO |
| OPEN-PR | PR exists, not merged | check CI; send to reviewer; merge or fix |
| ORPHAN | Commits or uncommitted changes in a worktree/branch with no PR | inspect `git diff --stat`; if sound and on the right branch, commit (correct identity and format) and open a PR; if wrong or half-done, report to me before discarding anything |
| BLOCKED | Waiting on a gate | list the gate |
| TODO | Not started | queue in TASKS order |

Also fix silently-dangerous state: wrong git identity on unpushed commits (fix before pushing, never after), stale worktrees for merged branches (remove), and leftover `.lock` files.

Do not delete branches, stashes or uncommitted work without asking me.

## Step 3 — Write `./.claude/STATE.md`

Format (keep it tight):

```
# STATE — updated <sprint day / step>
Sprint: <n>, branch: sprint/<n>-<slug> (both repos)
Gates waiting on owner: <list>
DONE: <step codes, comma-separated>
IN PROGRESS: <code> — <repo> — <branch/worktree> — PR #<n> — next action
TODO next (in order): <next 6–10 codes>
BLOCKED: <code> — <reason>
Open FIX items: <FIX-n: one line each>
Agents: <file names, model>
Notes: <≤5 lines of decisions that future sessions must know>
```

Also trim `.claude/agents/*.md`: each agent file should be ≤40 lines. Replace any pasted copies of rules/docs with path + section references and the token rules above.

## Step 4 — Report, then continue

Send me one message (≤15 lines): what was DONE, what you fixed in reconciliation, ORPHAN items that need my decision, gates waiting on me, and the next 5 steps. Then continue immediately with the next unblocked step(s) in TASKS order, following the per-step loop: worktree → build + tests → quiet check → commit(s) → PR → reviewer (diff only) → merge → tick → remove worktree → update `STATE.md`.

Before the session ends or context runs low, always: commit and push everything, update `STATE.md`, and stop cleanly.

---

## Next-session prompt (paste into each new session)

Lead Orchestrator, payless4laptops MVP. Read `./.claude/STATE.md` only. Verify it against reality cheaply (`git status -sb`, `gh pr list --state open` in both repos, `git worktree list`); correct STATE.md if it's wrong. Follow the token rules in `./inventory/CLAUDE_CODE_RESUME_PROMPT.md` (grep, don't reread). Continue from "IN PROGRESS"/"TODO next". Update STATE.md after every merge and before stopping.
