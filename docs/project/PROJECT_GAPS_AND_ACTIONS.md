# Project Gaps and Actions

> **Document set.** [README](README.md) · [1 Overview and Sprints](1-Overview-and-Sprints.md) · [2 Frontend](2-Frontend-Requirements.md) · [3 Backend](3-Backend-Requirements.md) · [4 DevOps](4-DevOps-Requirements.md) · [TASKS](../../TASKS.md) · [SKILLS](../../SKILLS.md) · [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).

Open decisions and gaps found across the project documents. Abbreviations (OVR, FE, BE, DEVOPS, DET, SPEC) are listed in `SKILLS.md`, Appendix C. Each gap shows a **recommended answer**; nothing is decided until the owner confirms it and it is recorded in the decision log at the bottom.

Last review: 2026-11-18 (all documents converted to Markdown and cross-checked; owner decisions applied).

**All critical gaps are decided and development is authorised (TASKS rule 0.7).** Still open, but not blocking: GAP-H01 hosting choice (needed for O1.1 in Sprint 1), GAP-H07 tax on receipts (before Sprint 6), GAP-M10 backup and log retention (before Sprint 2), and the recommendations in GAP-M07, M08 and M11.

## Critical gaps (all decided 2026-11-18)

| Gap | Decision needed | Where the documents disagree or are silent | Recommended answer |
|---|---|---|---|
| GAP-C01 | ~~Are barcodes, labels, scanning and per-unit tracking in scope now?~~ | | **Decided 2026-11-18:** deferred (follows GAP-C04). Files 5 and 6 updated to match. |
| GAP-C02 | ~~Keeping the data model ready for per-unit tracking~~ | | **Decided 2026-11-18:** stock at SKU-and-location level; every ledger row has a stable source reference and line ID; a unit reference can be added later as an optional link; no unit tables now. |
| GAP-C03 | ~~Which schedule and phase scope is the only one?~~ | | **Decided 2026-11-18:** the 9-sprint plan in OVR, no calendar dates, sales in the MVP (follows GAP-C04). |
| GAP-C04 | ~~Which documents take precedence?~~ | | **Decided 2026-11-18:** OVR, FE, BE and DEVOPS win. DET and SPEC are background and kept in sync with them; both were updated the same day. |
| GAP-C05 | ~~Which branches may front staff pick? How do combined roles work?~~ | | **Decided 2026-11-18:** front staff may pick any active branch. A user with several roles gets a role switcher; switching changes the whole view (menu, home dashboard, screens) to the selected role. |
| GAP-C06 | ~~Permission matrix and per-person permissions~~ | | **Decided 2026-11-18:** matrix drafted as B1.1 for approval on Sprint 1 Day 1; Super Admin grants per-person permissions (Receive stock, etc.) from the user edit screen (B3.3, F3.3) until the Sprint 5 role screen. |
| GAP-C07 | ~~Stock buckets and ledger entry rules~~ | | **Decided 2026-11-18:** follow SPEC s11.2 (dispatch: available → reserved/in transit; receipt credits approved quantity only). Storage detail goes in the ERD (B1.2). |
| GAP-C08 | ~~When and how are discrepancies resolved, and by whom?~~ | | **Decided 2026-11-18:** basic resolution of dispatch shortfalls in the MVP (Sprint 2 Day 7), branch transfers in Sprint 4. Any admin role (Super Admin, Warehouse Admin, Branch Admin) may resolve, within its allowed branches; front staff cannot. |

## High gaps (resolve before the sprint that needs them)

| Gap | Issue | Needed by | Recommended answer |
|---|---|---|---|
| GAP-H01 | Hosting provider, database host, object storage and domain names are not chosen. | Sprint 1, step O1.1 | Owner decides. |
| GAP-H02 | ~~Super Admin menu~~ | | **Decided 2026-11-18:** Home, Items, Warehouse, Branches, Users. Activity, Sell, Find and Receive are opened from Home. |
| GAP-H03 | ~~Warranty timing~~ | | **Decided 2026-11-18:** all warranty work moves to Sprint 3 (item field and warranty end date on sales, B14.2, F14.2). The receipt shows it from Sprint 6 (B29.1). Sprint 9 Day 43 keeps inspection and grading only. |
| GAP-H04 | ~~Several images and spec sheets not scheduled~~ | | **Decided 2026-11-18:** Sprint 3 Day 15 (B15.2, F15.2). |
| GAP-H05 | ~~Sale and transfer status words~~ | | **Decided 2026-11-18:** sales are Completed, Cancelled, Refunded, Exchanged (no "voided"); transfers use the SPEC s5.4 list. |
| GAP-H06 | ~~Development gate~~ | | **Decided 2026-11-18:** confirmed. No application code until the owner authorises development after the critical gaps are answered (TASKS rule 0.7). |
| GAP-H07 | Taxes and levies on receipts are to be confirmed with an accountant (OVR, confirmed assumptions). | Sprint 6, B29.1 | Owner gets the accountant's answer before Sprint 6. |

## Medium gaps (record the answer when convenient)

| Gap | Issue | Recommended answer |
|---|---|---|
| GAP-M01 | Release names: OVR said "v1.1, v1.2, Phase 1 complete, ..."; DEVOPS gives `v1.0.0` to `v2.4.0`. | **Synced:** DEVOPS tags adopted in OVR, FE, BE, TASKS and README. Owner to confirm. |
| GAP-M02 | BE s13 acceptance criteria were copied from DET's two-phase plan, so sales sat in Phase 2 and transfers in Phase 2, against the BE sprint plan. | **Synced:** BE s13 regrouped into MVP, Phase 1 and Phase 2 to match the sprint plan and FE s10. Owner to confirm. |
| GAP-M03 | BE s8 offered email or SMS notifications as optional while OVR and BE s14 defer them. | **Synced:** BE s8 now says in-app only; email, SMS, bundles, stocktake and offline mode added to BE s14. |
| GAP-M04 | The overdue-transfer reminder (BE s5 step 7) had a DevOps step (O4.1) but no backend step. | **Synced:** added to BE Sprint 4 Day 19 and TASKS B19.2. |
| GAP-M05 | `TASKS.md` stated 9 sprints but only listed Sprints 1 and 2. | **Synced:** Sprints 3 to 9 added with Git, Backend, Frontend and DevOps steps taken from FE, BE and DEVOPS. |
| GAP-M06 | `README.md` showed a single-repo layout, a Docker Compose file for both apps, clone URLs under "Equanz Technologies" and only 5 sprints. | **Synced:** two-repo layout, clone URLs under `maximusntibrey`, compose in the backend repo only, all 9 sprints. |
| GAP-M07 | Supplier is a free-text name in the MVP (B5.1) and becomes a supplier record in Sprint 9 (B44.1). | Store supplier name on the receipt now; in Sprint 9, create supplier records from the distinct names and link them. |
| GAP-M08 | Selling price comes "from the item" in the MVP (B6.1) and moves to price lists in Sprint 6 (B26.1). | Hold the MVP price in a one-row-per-SKU price table from the start, so Sprint 6 extends it instead of migrating. |
| GAP-M09 | Lead capture and AI agent (BE s10) are not scheduled. | Not scheduled; they can start after the website API in Sprint 9. Now noted in BE s10 and TASKS Deferrals. |
| GAP-M10 | Backup and log retention periods (DEVOPS s7, s8) are not set. | Owner decides before Sprint 2 (O2.2). |
| GAP-M11 | Branch Admin menu has no entry for the sales list and cancel (FE s4.10) or activity. | Reach the sales list from Sell, and activity from Home. No menu change. |

## Decision log

| Date | Gap | Decision | Decided by |
|---|---|---|---|
| 2026-11-18 | GAP-C04 | Files 1 to 4 win; files 5 and 6 are background and kept in sync (both updated). | Owner |
| 2026-11-18 | GAP-C01, GAP-C03 | Closed by GAP-C04: barcodes deferred; 9-sprint plan, no dates, sales in the MVP. | Owner |
| 2026-11-18 | GAP-C02 | Ledger rows carry a stable source reference and line ID; unit link can be added later; no unit tables now. | Owner |
| 2026-11-18 | Gate (rule 0.7) | All critical gaps answered; development authorised from Sprint 1. | Owner |
| 2026-11-18 | GAP-C08 (timing) | Basic resolution of dispatch shortfalls is pulled into the MVP (Sprint 2 Day 7: B7.3, B7.4, F7.3). Branch transfers keep Sprint 4. | Owner |
| 2026-11-18 | GAP-H02 | Super Admin menu: Home, Items, Warehouse, Branches, Users. Activity, Sell, Find and Receive opened from Home. | Owner |
| 2026-11-18 | GAP-C05 | Role switcher for combined roles; switching changes the whole view to the selected role. | Owner |
| 2026-11-18 | GAP-C06 | Permission matrix approved on Sprint 1 Day 1; per-person permissions granted by Super Admin from the user edit screen until Sprint 5. | Owner |
| 2026-11-18 | GAP-C07 | Stock buckets and movements follow SPEC s11.2. | Owner |
| 2026-11-18 | GAP-C08 (who) | Any admin role resolves shortfalls; front staff cannot. | Owner |
| 2026-11-18 | GAP-H03 | All warranty work moves to Sprint 3. | Owner |
| 2026-11-18 | GAP-H04 | Several images and spec sheets in Sprint 3 Day 15. | Owner |
| 2026-11-18 | GAP-H05 | Sale statuses Completed, Cancelled, Refunded, Exchanged. | Owner |
| 2026-11-18 | GAP-H06 | Development gate confirmed. | Owner |
