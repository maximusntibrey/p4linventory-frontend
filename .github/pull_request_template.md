## Step

<!-- Step code(s) from TASKS.md (for example B4.3) or FIX-<n> from the Fix log. One purpose per pull request. -->
Step:

## What changed and why

<!-- Short summary. Link the requirement section this implements (docs/project/...). -->

## Evidence

<!-- Paste the REAL output of the check command (`npm run check`), trimmed but never edited.
     If the check command does not exist yet, say so and paste what you ran instead.
     Never claim a test, command or CI run passed unless you saw it pass (TASKS 0.4). -->

```
(paste check command output here)
```

## Quality checklist (TASKS.md rule 0.3, verbatim)

Tick each item that applies, or write "n/a" with a reason after it.

- [ ] Code works and the step's tests exist and pass. Run the repo's single check command (lint, type check, tests) and it must be green.
- [ ] Every stock change goes through the one stock service (atomic, row-locked, with a ledger entry). Never edit balances directly.
- [ ] The audit trail and the stock ledger are append-only. Never write code that edits or deletes them.
- [ ] Permissions are enforced on the server for every protected action (role, active branch, approved access).
- [ ] Secrets never go in code or in git. Use environment variables. `.env` files are git-ignored.
- [ ] Cost price is visible only to SuperAdmin and Warehouse Admin. Cross-branch lookup shows branch name and quantity only.
- [ ] Timestamps are timezone-aware and shown in Africa/Accra time (storing in UTC is proposed, see `SKILLS.md`). Currency is GHS.
- [ ] Frontend: 360 px width with no sideways scroll, tap targets at least 44 px, every icon has a text label, status never shown by colour alone, keyboard navigation works.
- [ ] Do not mark a step done on partial work. If blocked, leave it unticked and note the blocker under "Open questions".

## Git and process (TASKS.md section 1)

- [ ] Branch is `feature/<step-code>-<slug>`, `fix/FIX-<n>-<slug>` or `chore/<slug>`, and targets the right base branch
- [ ] Commits use `<type>(<step-code>): <what changed>` and the author is maximusntibrey
- [ ] The step is ticked in this repo's `TASKS.md` in this pull request (only if fully done)
- [ ] `SKILLS.md` Appendix A updated for any new tool or package (vetted and pinned, TASKS 2.1)
- [ ] Documentation updated where behaviour changed (requirements, workflow, API contract, `SKILLS.md`)
- [ ] No secrets, `.env` files, build output or large binaries committed
- [ ] OpenAPI contract unchanged, or the change was agreed with the owner first (TASKS 0.2)
- [ ] Bug fix only: a test that failed before the fix and passes after it is included (TASKS 0.5)

## Review

<!-- Reviewer approval is recorded as a PR comment (one GitHub account, so no formal approving review). -->

## Open questions or blockers

<!-- Anything added under "Open questions" in TASKS.md, or "none". -->
