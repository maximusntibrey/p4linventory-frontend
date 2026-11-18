# Backend Requirements

**Status:** Current. Applies to the `eqp4l-backend` repo only.

> **Document set.** [README](README.md) · [1 Overview and Sprints](1-Overview-and-Sprints.md) · [2 Frontend](2-Frontend-Requirements.md) · [3 Backend](3-Backend-Requirements.md) · [4 DevOps](4-DevOps-Requirements.md) · [TASKS](../../TASKS.md) · [SKILLS](../../SKILLS.md) · [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).

Everything the server must do: data, rules, APIs, security, reports and deployment. Screens and interface are in the Frontend tab ([2-Frontend-Requirements.md](2-Frontend-Requirements.md)). Shared decisions, the API contract and the sprint overview are in the Overview and sprints tab ([1-Overview-and-Sprints.md](1-Overview-and-Sprints.md)). Hosting, deployment and backups are in [4-DevOps-Requirements.md](4-DevOps-Requirements.md). Step-by-step tasks are the `B` steps in [TASKS.md](../../TASKS.md).

> **How to read this.** Items marked **[NEW]** are not in the specification ([6-Functional-Workflow-Specification.md](6-Functional-Workflow-Specification.md)) and are added here.

## 1. Decisions and shared rules

Decisions, confirmed assumptions, the roles summary and the API contract are in the Overview and sprints tab. This tab covers the backend only.

## 2. Locations, roles and access

- **Locations:** one central warehouse and multiple branches. Each location holds its own stock balances.
- **Roles:** Super Admin, Warehouse Admin, Branch Admin and Front Staff. One account per person. Only Super Admins can assign a user more than one role.
- **[NEW] Login IDs:** Super Admins use their own ID format (for example SA-0001). All other users get a unique, system-generated neutral ID (for example USR-0001) that never changes and is never reused.
- **[NEW] Super Admin powers:** a Super Admin can do everything any user can do in every branch, plus manage accounts, roles, branches and prices. Each action is recorded under the Super Admin's own ID with the role and branch used. Super Admins can approve their own requests, and every self-approval is flagged in the audit trail.
- **[NEW] Front staff work at any branch:** once a front staff member has chosen a working branch, the server scopes every request to that branch. They can switch branches during the day, and each switch is logged.
- **Other users:** one permanent branch. Temporary access to another branch needs a request with a reason and approval by the destination Branch Admin or a Super Admin.
- **Active context:** after login the user works in one workspace and, if branch-based, one active branch. Every action records the user, role and branch.
- **Combined roles:** a user with more than one role switches between them; the server then returns the menu, dashboard data and permissions of the selected role only, and records the switch.
- **Server-side enforcement:** every protected action is checked by the backend against role, active branch and any approved access.
- **Warehouse-to-branch assignment** is restricted to Warehouse Admin (and Super Admin). No other role can assign stock.
- **[NEW] Cross-branch stock lookup:** any logged-in user can pick a product and see the quantity available at other branches (branch name and quantity only). It excludes prices, costs, customers and sales. This is an explicit exception to branch isolation, and the isolation tests must allow it.
- **Account administration:** create, edit, activate, deactivate and suspend accounts; reset credentials; assign roles and branches; view last login, session history and activity. Historical records are preserved when an account is deactivated.

## 3. Inventory item requirements

### 3.1 Item structure [NEW]

The specification lists product, category and unit of measure only. Laptops need more structure than that.

1. **Product** is the model-level record (for example, "HP 250 G9"). It holds the shared description, brand, category, images and spec sheet.
2. **Variant (SKU)** is a sellable configuration (for example, the same model with Core i5, 16 GB RAM, 512 GB SSD, silver). It holds the price, reorder levels and stock balances.

Stock is counted as a quantity per SKU at each location. Individual pieces are not tracked in this version (see section 14).

### 3.2 Fields common to every item

| Field | Required | Rule |
|---|---|---|
| SKU | Yes | Unique, system-generated or imported, never reused, immutable once used in a transaction |
| Name | Yes | Clear display name, including key spec for laptops |
| Category | Yes | Laptop, Laptop Part or Accessory, with a sub-type |
| Brand | Yes | Chosen from a managed list |
| Model name | Yes | For example, ThinkPad T14 Gen 3 |
| Manufacturer part number | Yes | The manufacturer's model or part number (MPN) |
| Description | No | Free text for customers and staff |
| Condition | Yes | New, Refurbished or Used |
| Unit of measure | Yes | Piece by default; set for items sold otherwise |
| Images | Yes (at least one) | Several per product, one marked primary; JPG, PNG or WebP; size limit enforced |
| Selling price | Yes | Held in the price list (section 3.7) |
| Cost price | No | Recorded at receipt; restricted visibility |
| Currency | Yes | Ghana cedi (GHS) |
| Tax category | No | Applied if taxes are configured |
| Reorder level | No | Set per location; drives low-stock alerts |
| Warranty terms | No | Type (manufacturer, shop or none) and period in months; used to calculate the warranty end date of an item sold |
| Supplier | No | One or more preferred suppliers |
| Show on website | Yes | Yes or no; controls whether the item appears in the website API |
| Search keywords | No | Alternative names and common misspellings |
| Status | Yes | Draft, Active or Discontinued |
| Audit fields | Auto | Created by, created at, last changed by, last changed at |

### 3.3 Laptops

Each distinct configuration is its own SKU.

| Group | Fields captured |
|---|---|
| Identity | Brand; series or product line; model name; manufacturer part number (MPN); segment (consumer, business, gaming, workstation, ultrabook, Chromebook, 2-in-1, rugged); form factor (clamshell, convertible, detachable); release year |
| Processor | Brand (Intel, AMD, Apple, Qualcomm); family (for example Core i5, Ryzen 5); exact model; generation; total cores, performance and efficiency cores; threads; base and maximum turbo speed (GHz); cache (MB); power rating (TDP, W) |
| Memory (RAM) | Size (GB); type (DDR3, DDR4, DDR5, LPDDR4X, LPDDR5); speed (MHz); soldered or removable; total slots and slots used; maximum supported (GB); upgradable yes or no |
| Storage | Primary drive: type (NVMe SSD, SATA SSD, HDD, eMMC), capacity, interface, form factor (M.2 2280, 2.5 in); second drive details; free storage slots; optical drive |
| Display | Size (in); resolution; aspect ratio; panel type (IPS, TN, VA, OLED); brightness (nits); refresh rate (Hz); touchscreen; matte or glossy; colour coverage (sRGB %) |
| Graphics | Integrated model; dedicated model; video memory (GB); graphics power (W) |
| Battery and charger | Battery capacity (Wh) and cell count; removable yes or no; claimed battery life; charger wattage; charger connector (barrel, USB-C, proprietary); charger included |
| Operating system | Name, version and edition; licence status (genuine, activated, none); language |
| Keyboard and input | Layout (US, UK, other); backlit; numeric keypad; fingerprint reader; trackpad type; pointing stick |
| Connectivity | Wi-Fi standard; Bluetooth version; Ethernet speed; mobile broadband or SIM slot |
| Ports | USB-A (count, version); USB-C (count, Thunderbolt, charging, display); HDMI; DisplayPort; Ethernet (RJ-45); audio jack; SD or microSD reader; VGA or other legacy; docking connector |
| Audio and camera | Webcam resolution; IR camera; microphones; speakers |
| Security | TPM; fingerprint reader; Kensington lock slot |
| Physical | Colour; chassis material; weight (kg); dimensions (mm) |

### 3.4 Laptop parts

Common to all parts:

- Part type and sub-type
- Brand and manufacturer part number (MPN)
- OEM number and cross-reference numbers for equivalent parts
- Quality type: original (OEM), compatible (aftermarket) or used (pulled from another machine)
- Quality grade, where suppliers grade parts (for example A+ for screens)
- Compatibility list (below)
- Colour, dimensions and weight, where relevant
- Pack quantity, where sold in packs
- Warranty and dead-on-arrival (DOA) terms
- Supplier, GRN reference and cost

**Compatibility list.** Each part links to the laptop brands, series and models it fits, so staff can search "parts for HP 15-dw". The link is many-to-many, and a part can also list the part numbers it replaces.

Type-specific fields:

| Part type | Specifications captured |
|---|---|
| Battery | Voltage (V); capacity (mAh and Wh); cell count; chemistry; connector type and pin count; internal or external; colour |
| Charger or adapter | Output wattage, voltage and current; connector type and tip size; USB-C PD yes or no; cable length; power cord included yes or no; plug type |
| Screen (LCD or LED panel) | Size (in); resolution; panel type; connector type and pin count; refresh rate; matte or glossy; touch yes or no; with or without frame; brightness |
| Touch digitiser or assembly | Size; fits models; with or without bezel |
| Keyboard | Layout (US, UK, other); backlit yes or no; with or without frame; connector; colour |
| Trackpad | Fits models; with or without cable; click type |
| RAM module | Type (DDR3, DDR4, DDR5); capacity (GB); speed (MHz); form factor (SO-DIMM or DIMM); voltage; ECC or non-ECC |
| SSD or HDD | Interface (SATA, NVMe, PCIe); form factor (M.2 2230, 2242, 2280, or 2.5 in); capacity; thickness; speed rating |
| Caddy or enclosure | Drive size supported; interface; fits models |
| Motherboard | Board number; chipset; processor supported; integrated or dedicated graphics; RAM type; test result |
| Processor or graphics chip | Model; socket or package; speed; tested yes or no |
| Cooling fan or heatsink | Fits models; connector pins; with or without heatsink; voltage |
| Casing and covers | Cover (A, B, C or D); colour; material; fits models; with or without parts attached |
| Hinges and brackets | Left or right; fits models; set or single |
| Speakers and microphones | Impedance; connector; left or right; fits models |
| Webcam module | Resolution; connector; fits models |
| Wi-Fi or Bluetooth card | Standard; form factor; interface; chipset |
| DC jack or charging port | Port type; wire length; connector; fits models |
| Display cable | Connector types and pin counts; length; fits models |
| Power button or fingerprint board | Fits models; with or without cable |
| CMOS battery | Type; voltage; connector |
| Optical drive | Interface; thickness; type (DVD, Blu-ray) |
| Screws and small parts | Kit contents; fits models |

### 3.5 Accessories

Common to all accessories:

- Accessory type and sub-type
- Brand, model and manufacturer part number (MPN)
- Colour, material, dimensions and weight
- Connectivity (wired, Bluetooth, 2.4 GHz receiver, USB-A, USB-C)
- Compatibility notes (operating system, laptop size or port type)
- Power (battery or mains, wattage), where relevant
- What is included in the box
- Warranty

| Accessory type | Specifications captured |
|---|---|
| Bags, backpacks and sleeves | Type; fits-up-to screen size (in); material; colour; water resistant; compartments |
| Mice | Wired or wireless; connection (receiver, Bluetooth, USB-C); DPI; button count; battery type; ergonomic; gaming yes or no |
| Keyboards | Wired or wireless; layout; backlit; mechanical or membrane; numeric keypad; size |
| Keyboard and mouse combos | Fields of both items; shared receiver |
| Headsets, headphones and earbuds | Type (over-ear, on-ear, in-ear); wired or wireless; connector (3.5 mm, USB, USB-C); microphone; noise cancelling; battery life |
| Speakers and microphones | Wired or wireless; power; connector; channels |
| Webcams | Resolution; frame rate; microphone; connection; autofocus |
| Flash drives | Capacity; USB version; connector (USB-A, USB-C, dual); speed |
| External drives | Type (HDD or SSD); capacity; interface; speed; shock resistant |
| Memory cards and card readers | Card type (SD, microSD); capacity; speed class; reader ports |
| Laptop chargers (universal and brand) | Wattage; voltage; connector tip or USB-C PD; compatible brands; cable length |
| Phone and USB chargers | Output wattage; ports (count and type); fast-charge standard; cable included |
| Power banks | Capacity (mAh); output wattage; ports; fast charging; cable included |
| Cables | Type (HDMI, DisplayPort, USB, Ethernet, power cord, VGA, audio); connector at each end; version; length (m); shielded |
| Adapters, hubs and docking stations | Connector types in and out; number and type of ports; power delivery; video output and resolution; compatible OS |
| Monitors | Size; resolution; panel; refresh rate; inputs; stand type; VESA mount |
| Stands, cooling pads and mounts | Fits-up-to size; adjustable; fan count; material; power |
| Screen protectors and privacy filters | Fits size or model; type (tempered, privacy, anti-glare) |
| Keyboard covers, skins and cases | Fits model; material; colour |
| Surge protectors, extension leads and UPS | Outlets; rated power (VA or W); battery runtime (UPS); cable length; plug type |
| Networking (routers, switches, Wi-Fi adapters) | Standard (Wi-Fi 5, 6, 6E); speed; ports; range; interface (USB, PCIe) |
| Printers and consumables | Type; connectivity; compatible models; ink or toner code; yield |
| Presenters, controllers and other peripherals | Type; connection; battery; compatibility |
| Security locks and cleaning kits | Lock type and cable length; kit contents |

**Bundles [NEW, later phase]:** a bundle SKU (for example, laptop plus bag plus mouse) that deducts each component from stock when sold.

### 3.6 Images and documents

- Multiple images per product, with a primary image.
- Accepted types and maximum sizes are enforced, and images are optimised for the website.
- A spec sheet or other document can be attached to a product.
- Images are removed from view, not deleted, once a product has transaction history.

### 3.7 Pricing

- A central price list sets the selling price per SKU, with price history (old price, new price, who changed it, when).
- Optional branch price override, as confirmed in the Overview and sprints tab.
- Only Super Admin, or a role granted a "Manage prices" permission, can change prices.
- Front staff cannot override a price during a sale unless given that permission.
- Cost is recorded at warehouse receipt. An average-cost method is used for margin and stock valuation reports, and any other method needs to be confirmed.

### 3.8 Stock per location

Each SKU at each location carries: on hand, reserved, in transit, quarantined or damaged, and available, where available equals on hand minus reserved. Movements follow the specification's movement rules (Functional Workflow Specification section 11.2): a dispatch moves quantity from available to reserved at the sender and marks it in transit; receipt clears the reservation and credits the destination's on hand with the approved quantity only. An optional bin or shelf label is kept for warehouse locations. Reorder level is set per location, and low-stock alerts fire when available quantity falls to or below it.

### 3.9 Item lifecycle

- Items are created as Draft, then made Active when complete. Only Active items can be received, assigned or sold.
- Edits are audited with before and after values.
- Items with transaction history cannot be deleted. They are marked Discontinued, which stops new transactions and keeps history.
- Duplicate warnings fire on matching SKU or near-identical name and model.

### 3.10 Search and filtering [NEW]

- Search by name, SKU, brand or model.
- Filter by category, brand, condition and price range.
- Laptop filters by processor, RAM, storage, screen size and operating system.
- Part filters by part type and compatible laptop model.
- Filter by stock availability, by branch and by low stock.

### 3.11 Bulk import and export [NEW]

- Downloadable CSV templates per category (laptops, parts, accessories), each with that category's full specification columns.
- Import validates every row, reports errors with row numbers, and supports a dry run before committing.
- Opening balances: existing stock is loaded through an "opening balance" import that writes stock ledger movements, never by editing balances directly.
- Exports are available for products, stock balances and ledger history, and every export is audited.

### 3.12 Validation rules

- Quantities are positive whole numbers unless the unit of measure allows decimals.
- Required fields depend on category, as set out above.
- Prices cannot be negative. A selling price below cost triggers a warning.
- Enumerated fields (condition, grade, RAM type, storage type) use managed lists, not free text.
- Stock balances cannot go negative.

## 4. Warehouse requirements

Follow the specification's receiving workflow and GRN, with these additions:

- **[NEW] Inspection and grading on receipt** for used and refurbished laptops, recorded per receipt line (grade, test results, condition notes and photos).
- **Supplier records** with name, contacts and terms, plus attachments for the invoice and delivery note.
- **Stock states:** available, reserved, in transit, quarantined or damaged.
- Receipts cannot be silently edited. Corrections use a reversal or adjustment.
- Duplicate submissions are prevented, and balances and ledger entries commit together.

## 5. Transfers

Warehouse to branch (Warehouse Admin only) and branch to branch (Branch Admin) both follow the same pattern:

1. Sender chooses the destination, items and quantities (and, for branch transfers, a reason).
2. The system validates available stock and reserves the quantities. They show as In transit.
3. The destination is notified in the app.
4. The destination enters the quantity that actually arrived for each item, then chooses approve all, approve partially (with a note) or reject (with a reason). Any shortfall is a discrepancy.
5. Only the approved quantities are credited to the destination. The sender cannot approve receipt.
6. An unresolved shortfall stays linked to the transfer as a discrepancy until resolved by one of: return to sender, confirm loss, record damage, or another authorised disposition. Any admin role (Super Admin, Warehouse Admin, Branch Admin) may resolve it, within the branches they are allowed to act in. Front staff cannot.
7. **[NEW]** Transfers not confirmed within a configurable time (suggested 48 hours) trigger a reminder and appear on dashboards as overdue.
8. **[NEW]** Discrepancy resolution paths are part of the Phase 1 acceptance criteria, since partial receipts will occur from day one.

## 6. Sales

- Users record sales in the system, in the branch they are working in. Staff search for the item, enter the quantity and confirm. The system blocks a sale if any item's quantity is more than the stock available at that branch.
- Prices come from the price list.
- Payment methods: cash, mobile money, card, and split payments across methods. Methods are configurable.
- **[NEW] Customer details:** optional for most sales, with name and phone required for warranty-bearing items so claims can be traced.
- **[NEW] Receipt:** unique reference, branch, staff, items, prices, total, payment method and time. It can be printed or shared digitally.
- **[NEW] Discounts:** only by a role with discount permission, with a mandatory reason and a recorded limit.
- **[NEW] Daily close:** each branch reconciles cash and mobile money totals against recorded sales at the end of the day, with variances logged.
- Sale confirmation, stock deduction, ledger entry and audit event succeed or fail together.
- Completed sales are never edited. Cancellations, refunds and exchanges use reversal workflows linked to the original sale. Sale statuses are Completed, Cancelled, Refunded and Exchanged.
- Sales history filters by branch, staff, date, item and payment method.

## 7. Adjustments, returns and reversals

- Adjustment types: damaged, expired, count variance, found stock, entry correction, restockable return.
- Every adjustment needs a mandatory reason and, where policy requires, approval.
- Reversals create a separate compensating movement linked to the original, which stays visible.
- **[NEW] Stock counts:** a basic stocktake workflow (count, compare, approve variances) is planned for after launch.

## 8. Notifications, dashboards and reports

**Notifications** (in app only; email and SMS are deferred, see section 14): incoming transfers, transfer status changes, access requests and decisions, low stock, discrepancies, overdue transfers, and pending approvals. Notifications never grant permissions or approve anything.

**Dashboard data:** endpoints return the figures each dashboard needs (stock per branch, quantities in transit, low stock, recent activity), scoped to the user's role and branch. How they are shown is described in the Frontend tab.

**Reports:**

- Sales summaries by day, week and month, and by branch, staff, product and payment method
- Stock balance by location, low stock and stock-outs
- GRN and supplier receiving history
- Dispatch and transfer history, discrepancies and overdue in-transit stock
- Adjustment, return and reversal history
- User activity and approval history
- **[NEW]** Stock valuation and gross margin (visible to authorised roles only)
- **[NEW]** Ageing stock, showing items that have not moved in a set number of days

## 9. Audit and tracking

- The audit trail is append-only. No application role can edit or delete it.
- Each event records user ID, role and workspace, active branch, action, reference, previous and new values, timestamp, and IP or device.
- Events include logins, failed logins, logouts, account and role changes, branch access and switches, receipts, dispatches, receiving decisions, transfers, sales, cancellations, refunds, exchanges, role switches, shortfall resolutions, adjustments, approvals, exports and sensitive admin changes.
- **User track record:** each user's page shows their full timeline of logins, branch switches, sales, adjustments, transfers and approvals, filterable by date, branch and action type.
- The stock ledger is append-only. Each movement references its source transaction and carries location, item, quantity, user and time.

## 10. Integrations [NEW]

- **Read-only API for the website:** product search, product detail and availability by branch, secured with an API key and rate limits. It exposes no costs, customers or sales data.
- **Lead capture and AI agent:** consume the same API so recommendations reflect live stock. Not scheduled in this plan: they can start once the website API is released in Sprint 9.

## 11. Non-functional requirements

- **Security:** hashed passwords, secure sessions, login rate limiting, HTTPS, server-side permission checks, secrets kept out of code.
- **Data integrity:** database transactions and row-level locking for every stock change, idempotency keys to prevent duplicate submissions, timezone-aware timestamps (Africa/Accra).
- **Performance:** search results and the product list should respond within about two seconds under normal load.
- **Reliability:** automated daily backups, a tested restore process, error monitoring, and a staging environment before production.
- **Testing:** automated tests for permissions, branch isolation (with the cross-branch exception), partial receiving, concurrency and reversals.
- **DevOps:** the project has no established setup, so allow time for hosting, deployment, migrations, rollback and monitoring.

## 12. Backend sprint plan

Each sprint is 5 working days. Days below list the backend work only. The Frontend tab has the matching screens, and the Overview and sprints tab has the sprint goals and release points. Anything not listed here (barcodes, scanning, POS and the other items in section 14) is not scheduled.

### Sprint 1 (Days 1 to 5)

- **Day 1:** scope and permission table (4 roles, plus per-person permissions such as Receive stock, Manage prices and discount), for owner approval; data model (users, roles, branches, items, stock balances, stock movements, dispatches, sales); endpoint list as the API contract (OpenAPI); repo, environments and CI; one check command; short requirements digest.
- **Day 2:** schema and migrations; user model and ID generator (SA- and USR-); login, logout, hashing, sessions, rate limit and login log; permission checks by role and branch; seed data (SA-0001, 3 branches, sample items with stock).
- **Day 3:** working-branch selection and switching endpoints; branch management API; user management API (auto ID, role, branch, deactivate, reset password, grant per-person permissions such as Receive stock); dashboard shell data.
- **Day 4:** item API (common fields, key specs, draft or active) with the item field definitions per category; one image upload; stock balances and the movement log (one service for every stock change, atomic with row locks); stock query API.
- **Day 5:** warehouse receipt API (supplier name, items, quantities, cost); dispatch API (Warehouse Admin only, quantities in transit); branch receiving API (quantity per line, shortfall flagged); queries for what is waiting at each branch.

### Sprint 2 (Days 6 to 10)

- **Day 6:** sale API (price from the item, payment method, stock deducted, overselling blocked) and sales list per branch; find and search API including other branches' quantities; CSV import API (items and opening quantity per location, with an error report); cancel sale API (Super Admin and Branch Admin, reason required, reversal entry).
- **Day 7:** dashboard and activity log endpoints; basic discrepancy resolution for dispatch shortfalls (return to sender, confirm loss, record damage), with a mandatory note, through the stock service with ledger and audit entries.
- **Day 8:** end-to-end, permission and branch-isolation tests; bug fixes.
- **Day 9:** performance check, security check of the MVP endpoints, backups and restore test, and fixes.
- **Day 10:** production deployment (after the owner's go-ahead); load real data and create users; short admin notes. MVP release (`v1.0.0`).

### Sprint 3 (Days 11 to 15)

- **Day 11:** fixes from real use (data, performance) and scheduled backups.
- **Day 12:** typed laptop specification fields with validation and filter columns.
- **Day 13:** part specifications, the compatibility catalogue, and "parts for laptop model X" search.
- **Day 14:** accessory specifications and filters; warranty terms on items (type and months) and the warranty end date calculated on each sale line.
- **Day 15:** split items into product and variant, with data migration; several images per product with a primary image, and spec-sheet attachments. Release `v1.1.0`.

### Sprint 4 (Days 16 to 20)

- **Day 16:** branch-to-branch transfers: create, validate and reserve, in transit.
- **Day 17:** transfers: receive, shortfalls, and the Sprint 2 discrepancy resolution extended to branch-to-branch transfers (plus any other authorised disposition).
- **Day 18:** stock adjustments and reversals with a mandatory reason and approval.
- **Day 19:** notifications (incoming stock, shortfalls, low stock, pending approvals) and their API; the overdue-transfer reminder job (configurable, suggested 48 hours, section 5 step 7), run by the scheduler set up in DevOps step O4.1.
- **Day 20:** buffer, regression and release. Release `v1.2.0`.

### Sprint 5 (Days 21 to 25)

- **Day 21:** branch access requests and approvals.
- **Day 22:** multi-role assignment by Super Admin, role switching (the selected role's permissions and dashboard only, switch logged), and a permissions review.
- **Day 23:** price history, the manage prices permission, and the below-cost warning.
- **Day 24:** user activity and stock movement history endpoints.
- **Day 25:** security review, performance check, tests, documentation and buffer. Release `v1.3.0`. Phase 1 complete.

### Sprint 6 (Days 26 to 30)

- **Day 26:** price lists.
- **Day 27:** branch price override.
- **Day 28:** discounts with permission and a reason.
- **Day 29:** receipt data (reference, items, totals, warranty end date where applicable).
- **Day 30:** customer details (required for warranty items). Release `v2.1.0`.

### Sprint 7 (Days 31 to 35)

- **Day 31:** split payments.
- **Day 32:** daily close (cash-up).
- **Day 33:** returns and refunds through reversals.
- **Day 34:** sales history filters and role dashboard data.
- **Day 35:** hardening and release `v2.2.0`.

### Sprint 8 (Days 36 to 40)

- **Day 36:** sales reports (by period, branch, staff, product, payment method).
- **Day 37:** stock balance, low stock and ageing reports.
- **Day 38:** receipt, supplier, transfer and shortfall reports.
- **Day 39:** adjustment and reversal history, stock valuation and margin.
- **Day 40:** audited CSV exports and release `v2.3.0`.

### Sprint 9 (Days 41 to 45)

- **Day 41:** read-only website API: search and product detail.
- **Day 42:** availability by branch, API keys and rate limits (no cost or customer data exposed).
- **Day 43:** inspection and grading per receipt line (warranty terms moved to Sprint 3).
- **Day 44:** supplier records.
- **Day 45:** security review, buffer and release `v2.4.0`. Phase 2 complete.

## 13. Backend acceptance criteria

Grouped by the release points in the Overview sprint plan, to match the Frontend acceptance criteria and DevOps section 12.

### MVP (end of Sprint 2, `v1.0.0`)

- Each user has one unique generated login ID (SA format for Super Admins, neutral format for everyone else).
- Front staff can select their working branch after login and see only that branch's data. Other users can access only their authorised branches.
- Items can be created with the common fields and key specs, saved as Draft and activated.
- Warehouse Admin can record receipts, and the system updates warehouse balances and ledger entries.
- Warehouse Admin can dispatch stock to a branch, and the stock becomes in transit.
- The destination branch can approve full or partial quantities, or reject with a reason, and any shortfall is flagged as a discrepancy linked to the dispatch.
- A dispatch discrepancy can be resolved by any admin role (not front staff) by return to sender, confirmed loss or recorded damage, and stays traceable.
- Front staff can complete a sale only for items in stock at their working branch, and each sale deducts stock and writes a sales record, ledger movement and audit event together.
- Super Admin and Branch Admin can cancel a sale with a reason, through a reversal linked to the original.
- Any user can look up other branches' stock for a selected item (branch name and quantity only).
- Existing stock can be loaded by CSV as opening balances.
- All movements and decisions are traceable by user, branch, role and time.

### Phase 1 complete (end of Sprint 5, `v1.3.0`)

- Every item can be created with its full specification (laptops, parts, accessories) and warranty terms, items are split into product and variant, and products hold several images and spec sheets.
- A user with more than one role can switch role, and only the selected role's permissions apply.
- Branch Admin can start a branch-to-branch transfer with stock validation. The destination approves fully, approves partially or rejects, and only approved quantities are credited.
- Partial and rejected receipts on branch-to-branch transfers create a discrepancy that can be resolved by return, confirmed loss or recorded damage, and stays traceable.
- Authorised users can submit and approve adjustments and reversals, and no one other than a Super Admin can approve their own request.
- Notifications are generated for the configured workflow events, including overdue transfers.
- Users other than front staff can request temporary access to another branch, and only the destination Branch Admin or a Super Admin can approve it.
- Only Super Admins can assign multiple roles.
- Price history is kept, only authorised roles can change prices, and a selling price below cost triggers a warning.
- Each user's track record shows their logins, branch switches, sales, adjustments, transfers and approvals.
- Automated tests cover role permissions, branch isolation (with the cross-branch exception), partial receiving, transfer discrepancies, stock concurrency and reversals.

### Phase 2 complete (end of Sprint 9, `v2.4.0`)

- Selling supports price lists with branch overrides, discounts with permission and a reason, receipts, customer details (required for warranty items), split payments, daily close, and returns and refunds through reversals.
- Dashboards and reports show accurate branch and warehouse data, and exports are audited.
- The website API returns search results and availability by branch without exposing costs, customers or sales data.
- Inspection and grading are recorded per receipt line, and supplier records are kept.

## 14. Deferred for a later update

These were specified earlier and are left out for now. They will be added in a later update.

- **Barcodes and labels:** a unique Code 128 barcode for every piece, label printing, and scanning at receiving, dispatch, transfers and sales.
- **Per-piece records:** one record per physical item, holding the manufacturer serial (unique for laptops), battery health, lock status, test results, grade, warranty dates, photos, location, status and full history. Existing stock quantities would be converted into per-piece records in one job. To make that possible, every stock ledger row carries a stable source reference and line ID now, and a unit reference can be added later as an optional link (decided 2026-11-18).
- Manufacturer barcode field, and search by barcode or serial.
- Per-piece warranty and repair tracking.
- **POS integration:** tills, receipt printers and scanners connected to the sales screen, to be planned.
- **Hardware:** a label printer and barcode scanners.
- **Bundles:** a bundle SKU that deducts each component when sold (section 3.5).
- **Stocktake workflow:** count, compare, approve variances (section 7).
- **Email and SMS notifications:** in-app notifications only for now (section 8).
- **Offline mode:** the system is online-only (Overview, confirmed assumptions).
