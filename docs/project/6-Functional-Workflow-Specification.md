# Inventory & Warehouse Management System

> **Status: Background, synced with files 1 to 4 on 2026-11-18.** This is the original workflow specification. It has been updated so it no longer conflicts with the current documents, which win on any difference: [1-Overview-and-Sprints.md](1-Overview-and-Sprints.md), [2-Frontend-Requirements.md](2-Frontend-Requirements.md), [3-Backend-Requirements.md](3-Backend-Requirements.md) and [4-DevOps-Requirements.md](4-DevOps-Requirements.md). It remains the source for workflow steps, GRN and transfer fields, stock movement rules (section 11) and the Django app layout (section 12).
>
> **Document set.** [README](README.md) · [1 Overview and Sprints](1-Overview-and-Sprints.md) · [2 Frontend](2-Frontend-Requirements.md) · [3 Backend](3-Backend-Requirements.md) · [4 DevOps](4-DevOps-Requirements.md) · [TASKS](../../TASKS.md) · [SKILLS](../../SKILLS.md) · [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).

## Functional Workflow Breakdown & Implementation Baseline

**Purpose.** A developer-oriented description of user access, branch operations, warehouse receiving, stock transfers, sales, inventory controls, reporting and audit requirements.

| Project decision | Confirmed approach |
|---|---|
| User identity | One unique, automatically generated login ID per person |
| Roles | A user may hold multiple assigned roles; only a Super Admin can assign more than one role |
| Branch assignment | One permanent/default branch for each branch-based user. Front staff instead pick a working branch after login and can switch during the day |
| Temporary branch access | For users other than front staff: requires a request and approval by destination Branch Admin or Super Admin |
| Login routing | Automatically opens the authorised default workspace; users with multiple roles can switch roles, and switching changes the whole view to the selected role |
| Proposed technology | Django REST API, PostgreSQL database and React frontend |
| Implementation plan | Nine sprints of 5 working days, no calendar dates (Overview section 4) |

Prepared as the baseline for detailed Django implementation and workflow diagram production.

### Document structure

1. System overview and operating principles
2. User accounts, multiple roles and login routing
3. Branch management and temporary branch access
4. Warehouse receiving and stock control
5. Warehouse-to-branch allocation and receiving
6. Branch-to-branch transfers
7. Sales
8. Adjustments, returns and reversals
9. Notifications, reports and dashboards
10. Audit trail and data integrity
11. Stock rules and calculations
12. Recommended Django application structure
13. Implementation phases and acceptance criteria
14. Workflow image plan

> **Important design principle.** The system must distinguish a user's identity, assigned roles, permanent branch and currently active branch context. A temporary branch approval grants access to that destination without changing the user's permanent branch. All protected actions must be authorised by the backend.

## 1. System overview and operating principles

The system manages inventory across a central warehouse and multiple operating branches. It controls who can access each workspace, how stock is received and moved, how sales affect stock, and how every transaction is recorded.

### Core operating entities

| Entity | Purpose |
|---|---|
| User | One person/account with a unique login ID |
| Role | A collection of permissions assigned to a user |
| Branch | A business operating location with its own stock position |
| Warehouse | Central stock-holding location |
| Product / Item | An inventory item tracked by the system |
| Stock balance | Quantity on hand, reserved and otherwise unavailable at a location |
| Stock movement | A receipt, dispatch, sale, adjustment, return or reversal |
| Approval | A recorded decision authorising or rejecting a workflow action |
| Audit event | An immutable record of an important user/system action |

### Operating principles

- One account per person; never create duplicate accounts just because a person has multiple roles or works temporarily at another branch.
- One permanent/default branch for each branch-based user. Temporary access to another branch is explicitly approved and logged.
- Role permissions are enforced server-side on every protected API endpoint.
- Stock in transit is not available for sale at either the sending or receiving location.
- Stock is credited to the receiving location only after the receiving party confirms the accepted quantity.
- Confirmed transactions are not deleted or silently edited. Corrections use controlled reversal or adjustment entries.
- Every important action is attributable to a user, role, location, timestamp and transaction reference.

### System context flow: identity → role permissions → authorised workspace

1. User opens login page
2. Enters unique User ID and password
3. System authenticates account and checks active status
4. System loads assigned roles and branch permissions
5. System opens default authorised workspace
6. User may switch to another assigned workspace or approved branch context

## 2. User accounts, multiple roles and login routing

### 2.1 Account creation

- Super Admin opens User Management and selects Create User.
- System captures required identity and employment details.
- System generates a unique login ID automatically (SA-0001 style for Super Admins, USR-0001 style for everyone else), checks that it has never been used, and never changes or reuses it.
- Super Admin assigns one or more roles to the account. Only a Super Admin can assign more than one role.
- Where the user is branch-based, Super Admin assigns one permanent/default branch.
- System creates the account, sets it active or pending activation, and issues a secure credential setup or password-reset process.
- System records who created the account and when.

### 2.2 Example role and account structure

| Example ID | Assigned roles | Permanent branch | Default workspace |
|---|---|---|---|
| SA-0001 | Super Admin | System-wide | Super Admin |
| USR-0001 | Warehouse Admin | Central Warehouse | Warehouse |
| USR-0002 | Branch Admin; Front Staff | TF Hostel | Branch Admin |
| USR-0003 | Front Staff | None (picks a working branch after login) | Sell |
| USR-0004 | Front Staff; Branch Admin | UPSA | Configured default |

Super Admins use the SA- format; every other user gets a neutral USR- ID, whatever their roles (Overview decision 2). Branch names are examples.

### 2.3 Login and dashboard routing

**Login and role-based dashboard routing**

1. Enter unique User ID and password
2. Validate credentials, account status and session
3. Load all assigned roles and permissions
4. Check configured default workspace
5. Open default dashboard; if none is configured, show authorised workspace selector
6. User switches workspace only among roles already assigned

### 2.4 Multiple-role rules

- A user has one account and one login ID even when assigned several roles.
- Roles are additive, but access is limited to the combined permissions explicitly granted to that account.
- A configured default workspace determines the first dashboard shown after login.
- If multiple roles exist and no default workspace is configured, show a role/workspace selector containing only authorised choices.
- Switching role changes the whole view (menu, home dashboard and screens) to the selected role, and only that role's permissions apply. Each switch is logged.
- Changing the active workspace does not change the user's identity or permanent branch.
- Every action records the actual user and the role/workspace context used.
- Super Admin can add or remove roles. Users cannot grant roles to themselves.

### 2.5 Account administration

- Create, edit, activate, deactivate and suspend accounts.
- Reset credentials and require secure password handling.
- Assign/remove roles and update the permanent branch assignment.
- View last login, session history and user activity.
- Preserve historical sales, approvals and stock transactions when an account is deactivated.

## 3. Branch management and temporary branch access

### 3.1 Branch setup

- Super Admin creates a branch with a unique Branch ID, name, location, contact details and operational status.
- Each branch has assigned Branch Admin users and its own stock balance.
- Branches can be activated or deactivated. Deactivation must not erase historical transactions.
- Branch users have one permanent/default branch unless they are system-wide roles such as Super Admin. Front staff do not have a fixed branch: they pick a working branch after login and can switch during the day, with each switch logged.

### 3.2 Branch-switch request workflow (temporary branch access request)

Applies to users other than front staff (scheduled for Sprint 5).

1. Staff logs in; system opens permanent branch
2. Staff selects Request Access to Another Branch
3. Select destination branch and enter mandatory reason
4. System creates pending request and notifies destination Branch Admin / Super Admin
5. Approver reviews requester, destination and reason
6. Approved: grant temporary access; rejected: record decision and reason
7. User switches branch only after approval; log access and switch events

### 3.3 Request and approval data

| Field | Requirement |
|---|---|
| Request reference | Unique ID for each access request |
| Requester | User ID and name |
| Permanent branch | User's default branch at request time |
| Destination branch | Branch being requested |
| Reason | Mandatory explanation from requester |
| Status | Pending, approved, rejected, expired or revoked |
| Decision | Approver, decision, reason and timestamp |
| Access period | Start and expiry time, if configured |
| Switch log | Actual time the user entered and left the temporary branch |

### 3.4 Access control rules

- Only the destination Branch Admin or Super Admin may approve or reject the request.
- The requester cannot approve their own request, except a Super Admin, whose self-approval is flagged in the audit trail.
- No access is granted while the request is pending or rejected.
- Approval grants temporary access to the requested branch; it does not change the permanent branch.
- Temporary access should have an expiry time or be revocable by authorised administrators.
- A user may request access again after rejection, with a new request and reason.
- All requests, decisions, branch switches and revocations remain in the audit history.
- Warehouse Admin does not receive branch-approval authority unless separately assigned that permission.

## 4. Warehouse receiving and stock control

### 4.1 Supplier stock receipt (warehouse receiving workflow)

1. Warehouse Admin opens Receive Stock
2. Enter the supplier (a supplier name in the MVP; supplier records from Sprint 9)
3. Add products, quantities, unit costs and receipt details
4. Verify actual delivered quantities
5. Confirm receipt; system generates unique GRN reference
6. Increase warehouse on-hand stock and write stock ledger entry

### 4.2 Goods Received Note (GRN) fields

| Field | Description |
|---|---|
| GRN reference | Unique receipt identifier generated by the system |
| Supplier | Supplier providing the goods |
| Item / SKU | Product being received |
| Quantity received | Actual quantity physically accepted |
| Unit cost | Recorded purchase cost, where applicable |
| Date/time | Receipt timestamp |
| Received by | Warehouse Admin user ID |
| Notes / attachments | Invoice, delivery note, batch or other supporting details |

### 4.3 Warehouse stock states

- **Available:** physically recorded stock that can be allocated.
- **Reserved:** stock committed to an outgoing dispatch but not yet resolved.
- **In transit:** stock dispatched and awaiting destination verification.
- **Quarantined / damaged:** stock excluded from normal allocation and sale pending investigation.

### 4.4 Receiving controls

- Only authorised warehouse users can confirm warehouse receipts.
- Receipt quantities must be validated as positive and within configured limits.
- System must prevent duplicate submission of the same receipt operation.
- Once confirmed, the receipt is not silently edited; corrections require an authorised reversal or adjustment.
- Stock balance and ledger entries must be committed together in one database transaction.

## 5. Warehouse-to-branch allocation and receiving

### 5.1 Dispatch workflow (warehouse dispatch to branch)

1. Warehouse Admin opens Branch Allocation
2. Select destination branch, items and quantities
3. System validates available warehouse stock
4. Confirm dispatch and generate transfer reference
5. Reserve/deduct dispatch quantity from warehouse available stock
6. Set transfer to In Transit and notify destination branch
7. Destination verifies actual quantities and submits receiving decision

### 5.2 Receiving outcomes

| Outcome | System action |
|---|---|
| Approve all | Credit all dispatched quantities to destination branch; close transfer. |
| Approve partially | Credit only accepted quantities; record discrepancy and keep remaining quantity unresolved until disposition. |
| Reject all | Do not credit destination branch; record rejection reason and keep stock discrepancy/return process traceable. |

### 5.3 Example: dispatch 100, receive 95

| Measure | Quantity |
|---|---|
| Warehouse dispatch | 100 |
| Physical quantity received | 95 |
| Quantity approved | 95 |
| Discrepancy / outstanding | 5 |

The branch receives 95 units into available stock. The remaining 5 units must remain visible against the transfer for investigation, return, loss confirmation or other authorised resolution. They must not disappear from the records. Any admin role (Super Admin, Warehouse Admin, Branch Admin) may resolve them; front staff cannot.

### 5.4 Transfer record fields

| Field | Description |
|---|---|
| Transfer reference | Unique dispatch/transfer ID |
| Origin | Warehouse |
| Destination | Branch ID |
| Items and quantities | Dispatched quantity per item |
| Status | Draft, dispatched, in transit, partially received, completed, rejected or under investigation |
| Dispatched by | Warehouse Admin |
| Received by | Authorised destination user |
| Decision details | Accepted quantity, rejected quantity, notes and timestamp |

## 6. Branch-to-branch transfers

### 6.1 Transfer initiation and validation

- Branch Admin opens Branch Transfers and selects a destination branch.
- User selects products, quantities and a mandatory transfer reason.
- System checks that the destination is active and that the user has transfer permission.
- System checks available stock at the sending branch, excluding already reserved quantities.
- System creates a unique transfer reference and records the initiator.

**Branch-to-branch transfer workflow**

1. Sending Branch Admin creates transfer request
2. Choose destination, items, quantities and reason
3. System validates stock and permissions
4. Confirm dispatch; reserve stock at source
5. Mark In Transit and notify destination branch
6. Destination verifies actual quantities
7. Approve all / approve partially / reject with reason
8. Credit only approved quantities; resolve remaining discrepancy

### 6.2 Transfer controls

- Sender cannot approve the receiving decision on behalf of the destination branch.
- Only approved quantities are added to destination stock.
- Reserved and in-transit quantities cannot be sold by the sending or receiving branch.
- Rejected, missing or damaged quantities remain attached to the transfer until resolved.
- Every transfer records source, destination, initiator, dispatch user, receiver, approver, timestamps, item quantities and notes.
- Transfer dispatch and source stock reservation must be atomic to prevent overselling.

## 7. Sales

POS hardware integration is a later update, not scheduled. Sales are recorded on the Sell screen.

**Sale workflow**

1. Front Staff opens the Sell screen in the authorised active branch
2. Select products and enter quantities
3. System retrieves authorised selling prices
4. Select payment method and optional customer details
5. System checks available branch stock
6. Insufficient stock: block sale and explain shortage
7. Sufficient stock: confirm sale, generate reference and deduct stock
8. Write sales record, stock ledger and audit event

### 7.1 Sales record

| Field | Description |
|---|---|
| Sale reference | Unique sale transaction ID |
| Branch | Active branch context at time of sale |
| Staff | User who recorded the sale |
| Items | Products sold |
| Quantity | Quantity sold per item |
| Unit price | Authorised selling price at time of sale |
| Total | Calculated transaction total |
| Payment method | Cash, mobile money or other configured method |
| Customer | Optional customer reference |
| Timestamp | Date and time of sale |
| Status | Completed, Cancelled, Refunded or Exchanged |

### 7.2 Sales rules

- System checks available stock before completing a sale.
- Sales are blocked if any line item exceeds available quantity.
- Prices are retrieved from authorised price configuration; front staff should not freely override prices unless specifically permitted.
- Sale confirmation, stock deduction, ledger entry and audit event must succeed or fail together.
- Completed sales are not silently edited. Cancellations, refunds, exchanges and corrections use authorised reversal workflows.
- Sales history can be filtered by branch, staff, date, item and payment method.

## 8. Adjustments, returns and reversals

### 8.1 Adjustment workflow (inventory adjustment workflow)

1. Authorised user opens Stock Adjustment
2. Select location, item and adjustment type
3. Enter quantity and mandatory reason
4. Submit adjustment for approval where required
5. Approver reviews supporting details
6. Approved: post adjustment to stock and ledger; rejected: record decision
7. Write immutable audit event

### 8.2 Adjustment examples

- Damaged or expired goods.
- Physical count variance.
- Stock found during reconciliation.
- Incorrect stock entry requiring correction.
- Approved customer return that is suitable for restocking.

### 8.3 Reversal workflow

- Locate the original confirmed transaction by its reference.
- Submit a reversal request with a mandatory reason and supporting notes.
- An authorised approver reviews it where required by policy. Only a Super Admin may approve their own request, and that is flagged in the audit trail.
- System creates a separate reversal movement linked to the original transaction.
- Original transaction remains unchanged and visible.
- Enter the corrected transaction separately if needed.

> A reversal must not erase the original event. The ledger should show both the original movement and the compensating reversal.

## 9. Notifications, reports and dashboards

### 9.1 Notification events

- Incoming warehouse transfer or branch transfer.
- Transfer dispatched, partially received, completed or rejected.
- Branch access request submitted, approved, rejected, expired or revoked.
- Low-stock threshold reached.
- Stock discrepancy or overdue in-transit transfer.
- Pending approval requiring action.

Notifications are in-app only. Email and SMS are deferred to a later update. Notifications must not themselves grant permissions or approve transactions.

### 9.2 Dashboard visibility

| Workspace | Information shown |
|---|---|
| Super Admin | All branches, warehouse balances, sales, transfers, user accounts, approvals, reports and audit overview |
| Warehouse Admin | Supplier receipts, warehouse balances, reserved stock, dispatches, in-transit transfers and pending receipts |
| Branch Admin | Assigned branch stock, sales, incoming/outgoing transfers, pending approvals, low stock and branch staff activity |
| Front Staff | Sell, active branch stock availability, own sales history and permitted branch access request status |

### 9.3 Reports

- Daily, weekly and monthly sales summaries.
- Sales by branch, staff, product and payment method.
- Stock balance by warehouse and branch.
- Low-stock and stock-out reports.
- Supplier receiving and GRN history.
- Warehouse dispatch and branch transfer history.
- Transfer discrepancies and overdue in-transit stock.
- Inventory adjustment, return and reversal history.
- User activity and approval history.

## 10. Audit trail and data integrity

The audit trail is a system-wide record of important events. It should be append-only for normal application users and protected from alteration.

| Audit field | Purpose |
|---|---|
| User ID | Who performed the action |
| Role/workspace | Which authorised role context was used |
| Active branch | Branch context, if applicable |
| Action | Operation performed |
| Reference | Related sale, receipt, transfer, request or adjustment |
| Previous / new value | Before-and-after values for relevant changes |
| Timestamp | Date and time of the event |
| IP / device | Available security context |

### Events to record

- Login, logout, failed login and account status changes.
- Role assignment/removal and permanent branch assignment changes.
- Branch access request, approval, rejection, switch and revocation.
- Warehouse receipt, dispatch and receiving confirmation.
- Branch transfer initiation, dispatch and receiving decision.
- Sales, cancellations, refunds, exchanges and reversals.
- Stock adjustments and reconciliation.
- Approval decisions, report exports and sensitive administrative changes.

### Data integrity requirements

- Use database transactions for multi-step stock operations.
- Use row-level locking or equivalent concurrency controls when changing stock balances.
- Prevent duplicate submissions using idempotency keys or unique operation references where appropriate.
- Do not allow stock balances to become negative unless an explicitly authorised exception policy exists.
- Preserve original transaction data and link reversals to the source transaction.
- Use timestamps consistently and store them in a timezone-aware format.
- Restrict audit-log access and never expose privileged audit operations to ordinary users.

## 11. Stock rules and calculations

### 11.1 Core stock definitions

**On hand:** physical quantity recorded at a location. **Reserved:** quantity committed to an outgoing transaction but not yet resolved. **Available:** quantity that may be sold or allocated.

> Available quantity = On-hand quantity − Reserved quantity

### 11.2 Movement behaviour

| Movement | Source effect | Destination effect |
|---|---|---|
| Supplier receipt | — | Warehouse on-hand increases |
| Warehouse dispatch | Warehouse available decreases / reserved increases | Branch unchanged until approval |
| Branch receipt approval | In-transit quantity resolved | Branch on-hand increases by accepted quantity |
| Branch-to-branch dispatch | Source available decreases / reserved increases | Destination unchanged until approval |
| Branch transfer approval | In-transit quantity resolved | Destination on-hand increases by accepted quantity |
| Sale | Branch on-hand decreases by sold quantity | — |
| Positive adjustment | Location on-hand increases | — |
| Negative adjustment | Location on-hand decreases | — |
| Reversal | Compensating movement linked to original | Depends on reversed transaction |

### 11.3 Partial, rejected and missing stock

- Record dispatched quantity, physically received quantity, accepted quantity and rejected quantity separately.
- Keep unresolved quantities linked to the original transfer reference.
- Provide a controlled resolution path: return to sender, confirm loss, record damage, or other authorised disposition.
- Do not credit rejected or unverified quantities to destination available stock.
- Do not release reserved stock back to the sender until the discrepancy or return outcome is resolved according to policy.

### 11.4 Concurrency and atomicity

For a sale or dispatch, the backend should lock or safely re-check the relevant stock rows inside a database transaction. The system must validate available quantity and write the transaction and ledger movement atomically. This prevents two simultaneous requests from consuming the same stock.

## 12. Recommended Django application structure

Recommended architecture: Django REST API for business logic, PostgreSQL for relational data and transactional integrity, and React for the user interface. Use serializers and API views/viewsets; the workflow does not require Django `forms.py`.

| Django app | Responsibilities / example models |
|---|---|
| `accounts` | User, profile, login ID generation, account status, sessions |
| `roles` | Role, Permission, UserRole, role/workspace defaults |
| `branches` | Branch, permanent branch assignment, branch status |
| `branch_access` | BranchAccessRequest, decision history, temporary access grant, switch log |
| `inventory` | Product, variant (SKU), category, specifications, unit of measure, stock balance |
| `warehouse` | Supplier, GoodsReceipt, GoodsReceiptLine, warehouse location |
| `transfers` | StockTransfer, TransferLine, dispatch, receipt and discrepancy resolution |
| `sales` | Sale, SaleLine, payment method, refund / void references |
| `stock_ledger` | StockMovement, movement reference, location balance history |
| `approvals` | ApprovalRequest, ApprovalDecision, approval policy |
| `notifications` | Notification, delivery status, user preferences |
| `reports` | Report queries, summary endpoints and export jobs |
| `audit` | AuditEvent, before/after snapshots, actor and context |

### 12.1 Suggested API groups

| API group | Example operations |
|---|---|
| Authentication | Login, logout, current user, password reset |
| Users and roles | Create user, assign roles, deactivate user, set default workspace |
| Branches | Create branch, update branch, list branches |
| Branch access | Request access, approve/reject, list requests, revoke access, record switch |
| Warehouse | Receive stock, view balances, list GRNs |
| Transfers | Create, dispatch, receive, partially approve, reject, resolve discrepancy |
| Sales | Create sale, list sales, cancel, refund or exchange a sale |
| Inventory | View stock, adjust stock, reconcile stock |
| Reports | Sales summaries, stock reports, transfer reports, activity reports |

### 12.2 Technical safeguards

- Use a custom Django user model from the beginning, with a unique immutable login identifier.
- Represent multiple roles through a many-to-many assignment or a dedicated user-role model.
- Represent permanent branch assignment separately from temporary branch access grants.
- Use backend permission classes and service-layer functions for critical operations.
- Use PostgreSQL atomic transactions and row-level locking for stock changes.
- Keep the stock ledger append-only and make each movement reference a source transaction.
- Validate every request against the user's roles, active branch and approved temporary access.
- Write automated tests for permission boundaries, partial receiving, concurrency and reversal logic.

## 13. Implementation phases and acceptance criteria

The earlier plan of two 10-day phases with target dates is replaced. The work runs in 9 sprints of 5 working days with no calendar dates; the plan, goals and release tags are in [1-Overview-and-Sprints.md](1-Overview-and-Sprints.md), section 4.

| Release point | Sprints | Scope |
|---|---|---|
| MVP, `v1.0.0` | 1 and 2 | Authentication, users and branches, working-branch selection, items and stock, warehouse receiving, warehouse-to-branch dispatch and receiving with basic shortfall resolution, sales, find, CSV import, dashboard and activity log, deployment. |
| Phase 1 complete, `v1.3.0` | 3 to 5 | Full specifications, product and variant split, branch transfers, adjustments and reversals, notifications, branch access requests, multiple roles and role switching, price history, activity screens. |
| Phase 2 complete, `v2.4.0` | 6 to 9 | Price lists, discounts, receipts, customer details, split payments, daily close, returns and refunds, reports and exports, website API, inspection and grading, supplier records. |

### 13.1 and 13.2 Acceptance criteria

The acceptance criteria for each release point are in Backend section 13, Frontend section 10 and DevOps section 12.

### 13.3 Deployment considerations

- Configure environment variables and secrets securely.
- Set up database backups and a tested restore process.
- Use HTTPS and secure session/token handling.
- Configure application logging, error monitoring and uptime checks.
- Use a staging environment before production deployment.
- Document deployment, rollback and database migration procedures.
- Plan DevOps foundations because the project currently has no established DevOps setup.

## 14. Workflow image plan

The detailed workflows should be visualised as eight separate diagrams. Each diagram should show the normal path, decision points, alternate outcomes, responsible role and resulting stock/data changes.

| Image | Title | What it must show |
|---|---|---|
| 1 | User Accounts and Login | Unique login ID, account creation, multiple roles, authentication, default workspace and role switching. |
| 2 | Branch Management and Access | Permanent branch, request reason, destination approver, approval/rejection, temporary grant, expiry/revocation. |
| 3 | Warehouse Receiving | Supplier receipt, quantity verification, GRN, warehouse stock increase and ledger update. |
| 4 | Warehouse-to-Branch Transfer | Allocation, stock validation, dispatch reservation, in-transit status, branch verification, full/partial/rejection outcomes. |
| 5 | Branch-to-Branch Transfer | Initiation, source reservation, dispatch, destination approval and discrepancy resolution. |
| 6 | Sales | Product selection, price retrieval, stock validation, blocked sale or completed sale, stock deduction and references. |
| 7 | Adjustments and Audit | Adjustment request, approval, reversal, original record preservation and audit events. |
| 8 | Notifications, Reports and Architecture | Role dashboards, alerts, reports, central audit and connections between modules. |

### Visual standards

- Use consistent role colours and clearly labelled swimlanes.
- Show who performs each action: Super Admin, Warehouse Admin, Branch Admin, Front Staff or System.
- Use decision diamonds for approval, stock availability and full/partial/rejection outcomes.
- Show the stock effect at each movement, especially reservation, in-transit and destination credit.
- Show unique references and audit/ledger updates at the points where they occur.
- Use readable landscape layouts and avoid squeezing all workflows into one poster.

*End of functional workflow specification*
