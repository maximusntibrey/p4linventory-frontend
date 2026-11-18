# Inventory & Warehouse System: Detailed Requirements

> **Status: Background, synced with files 1 to 4 on 2026-11-18.** This was the 11 November 2026 detailed requirements. It has been updated so it no longer conflicts with the current documents, which win on any difference: [1-Overview-and-Sprints.md](1-Overview-and-Sprints.md), [2-Frontend-Requirements.md](2-Frontend-Requirements.md), [3-Backend-Requirements.md](3-Backend-Requirements.md) and [4-DevOps-Requirements.md](4-DevOps-Requirements.md). Main changes: barcodes, per-unit records, serials and scanning are deferred; calendar dates are replaced by the 9-sprint plan; sales are in the MVP.
>
> **Document set.** [README](README.md) · [1 Overview and Sprints](1-Overview-and-Sprints.md) · [2 Frontend](2-Frontend-Requirements.md) · [3 Backend](3-Backend-Requirements.md) · [4 DevOps](4-DevOps-Requirements.md) · [TASKS](../../TASKS.md) · [SKILLS](../../SKILLS.md) · [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).

Prepared 11 November 2026, synced 18 November 2026. Baseline: the Inventory & Warehouse Management System functional workflow specification, plus decisions made earlier in this project.

> **How to read this.** Items marked **[NEW]** are not in the specification and are added here.

## 1. Decisions made

### Confirmed

| # | Decision | Outcome |
|---|---|---|
| 1 | Branch access | Front staff can work at any branch. After login they pick the branch they are working in, and every screen then uses that branch's data. Other users have one permanent branch and need an approved request for temporary access elsewhere. |
| 2 | Login IDs and roles | Super Admins have their own ID format (for example SA-0001). Every other user has a unique neutral ID (for example USR-0001). Only Super Admins can assign more than one role to a user. Super Admins can do everything any user can do, in every branch. |
| 3 | Barcodes and stock counting | Barcodes, labels, scanning and per-unit records are deferred to a later update (section 3.6). Stock is counted as a quantity per SKU at each location. |
| 4 | Item specifications | Full laptop hardware, parts and accessory specifications are captured (sections 3.3 to 3.5). |
| 5 | Sales and POS | Users record sales in the system by selecting items. A simple version is part of the MVP and is built up in later sprints. POS integration is a later update, not scheduled. |
| 6 | Scope additions | Cross-branch stock lookup, website API, CSV import with opening balances, price list and cost visibility, discounts, receipts, daily cash-up, warranty terms, and used-laptop grading (recorded per receipt line) are in scope. Repair tracking is deferred. |
| 7 | Timeline | No calendar dates. Nine sprints of 5 working days, tracked by sprint and day number (Overview section 4). The MVP is released at the end of Sprint 2 (day 10). |
| 8 | Approving your own work | Super Admins can approve their own requests, and each self-approval is flagged in the audit trail. All other users cannot approve their own requests. |

### Assumptions confirmed

- **Condition and grade scale:** New, Refurbished and Used, with grade A, B or C.
- **Pricing:** one price list with an optional branch override, and cost visible to Super Admin and Warehouse Admin only.
- **Who confirms receipt at a branch:** Branch Admin plus front staff who hold the Receive stock permission, granted per person by a Super Admin.
- **Payments, receipts and taxes:** cash, mobile money, card and split payments, with printed and digital receipts. How taxes and levies appear on receipts is to be confirmed with an accountant before the receipt format is finalised.
- **Connectivity:** the system is online-only for now. Offline mode can be revisited if outages are frequent.

## 2. Locations, roles and access

- **Locations:** one central warehouse and multiple branches. Each location holds its own stock balances.
- **Roles:** Super Admin, Warehouse Admin, Branch Admin and Front Staff. One account per person. Only Super Admins can assign a user more than one role.
- **[NEW] Login IDs:** Super Admins use their own ID format (for example SA-0001). All other users get a unique, system-generated neutral ID (for example USR-0001) that never changes and is never reused.
- **[NEW] Super Admin powers:** a Super Admin can do everything any user can do in every branch, plus manage accounts, roles, branches and prices. Each action is recorded under the Super Admin's own ID with the role and branch used. Super Admins can approve their own requests, and every self-approval is flagged in the audit trail.
- **[NEW] Front staff work at any branch:** after login a front staff member picks the branch they are working in. All screens, sales and stock actions then use that branch only. They can switch branches during the day, and each switch is logged.
- **Other users:** one permanent branch. Temporary access to another branch needs a request with a reason and approval by the destination Branch Admin or a Super Admin.
- **Active context:** after login the user works in one workspace and, if branch-based, one active branch. Every action records the user, role and branch.
- **Combined roles:** a user with more than one role uses a role switcher, and switching changes the whole view to the selected role.
- **Server-side enforcement:** every protected action is checked by the backend against role, active branch and any approved access.
- **Warehouse-to-branch assignment** is restricted to Warehouse Admin (and Super Admin). No other role can assign stock.
- **[NEW] Cross-branch stock lookup:** any logged-in user can pick a product and see the quantity available at other branches (branch name and quantity only). It excludes prices, costs, customers and sales. This is an explicit exception to branch isolation, and the isolation tests must allow it.
- **Account administration:** create, edit, activate, deactivate and suspend accounts; reset credentials; assign roles and branches; view last login, session history and activity. Historical records are preserved when an account is deactivated.

## 3. Inventory item requirements

### 3.1 Item structure [NEW]

The specification lists product, category and unit of measure only. Laptops need more structure than that.

1. **Product** is the model-level record (for example, "HP 250 G9"). It holds the shared description, brand, category, images and spec sheet.
2. **Variant (SKU)** is a sellable configuration (for example, the same model with Core i5, 16 GB RAM, 512 GB SSD, silver). It holds the price, reorder levels and stock balances.

Stock is counted as a quantity per SKU at each location. Individual pieces (units) are not tracked in this version (section 3.6).

### 3.2 Fields common to every item

| Field | Required | Rule |
|---|---|---|
| SKU | Yes | Unique, system-generated or imported, never reused, immutable once used in a transaction |
| Name | Yes | Clear display name, including key spec for laptops |
| Category | Yes | Laptop, Laptop Part or Accessory, with a sub-type |
| Brand | Yes | Chosen from a managed list |
| Model name | Yes | For example, ThinkPad T14 Gen 3 |
| Manufacturer part number (MPN) | Yes | The manufacturer's model or part number |
| Description | No | Free text for customers and staff |
| Condition | Yes | New, Refurbished or Used |
| Unit of measure | Yes | Piece by default; set for items sold otherwise |
| Images | Yes (at least one) | Several per product, one marked primary; JPG, PNG or WebP; size limit enforced |
| Selling price | Yes | Held in the price list (section 3.8) |
| Cost price | No | Recorded at receipt; restricted visibility |
| Currency | Yes | Ghana cedi (GHS) |
| Tax category | No | Applied if taxes are configured |
| Reorder level | No | Set per location; drives low-stock alerts |
| Warranty terms | No | Type (manufacturer, shop or none) and period in months; used to calculate the warranty end date of an item sold (Sprint 3) |
| Supplier | No | One or more preferred suppliers |
| Show on website | Yes | Yes or no; controls whether the item appears in the website API |
| Search keywords | No | Alternative names and common misspellings |
| Status | Yes | Draft, Active or Discontinued |
| Audit fields | Auto | Created by, created at, last changed by, last changed at |

### 3.3 Laptops

Each distinct configuration is its own SKU.

Per-unit details (battery condition, lock status, cosmetic grade and notes, test results, refurbishment, box contents, unit barcode, serial number, warranty dates, sourcing, location and status) belong to per-piece records, which are deferred (section 3.6). Grade, test results, condition notes and photos are recorded per receipt line instead (section 4).

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

### 3.6 Barcodes and unit identification (deferred)

Barcodes, labels, scanning, per-piece (unit) records, manufacturer serials, the manufacturer barcode field, search by barcode or serial, per-piece warranty and repair tracking, and the label printer and scanner hardware are deferred to a later update. The full list is in Backend section 14.

So that per-piece tracking can be added later without rework, the data model keeps stock at SKU-and-location level and gives every stock ledger row a stable source reference and line ID; a unit reference can be added later as a new, optional link. No unit tables are built now.

### 3.7 Images and documents

- Multiple images per product, with a primary image (Sprint 3). Condition photos for used laptops are recorded per receipt line (section 4).
- Accepted types and maximum sizes are enforced, and images are optimised for the website.
- A spec sheet or other document can be attached to a product.
- Images are removed from view, not deleted, once a product has transaction history.

### 3.8 Pricing

- A central price list sets the selling price per SKU, with price history (old price, new price, who changed it, when).
- Optional branch price override, as confirmed in the Overview.
- Only Super Admin, or a role granted a "Manage prices" permission, can change prices.
- Front staff cannot override a price during a sale unless given that permission.
- Cost is recorded at warehouse receipt. An average-cost method is used for margin and stock valuation reports, and any other method needs to be confirmed.

### 3.9 Stock per location

Each SKU at each location carries: on hand, reserved, in transit, quarantined or damaged, and available, where available equals on hand minus reserved. An optional bin or shelf label is kept for warehouse locations. Reorder level is set per location, and low-stock alerts fire when available quantity falls to or below it.

### 3.10 Item lifecycle

- Items are created as Draft, then made Active when complete. Only Active items can be received, assigned or sold.
- Edits are audited with before and after values.
- Items with transaction history cannot be deleted. They are marked Discontinued, which stops new transactions and keeps history.
- Duplicate warnings fire on matching SKU or near-identical name and model.

### 3.11 Search and filtering [NEW]

- Search by name, SKU, brand or model.
- Filter by category, brand, condition and price range.
- Laptop filters by processor, RAM, storage, screen size and operating system.
- Part filters by part type and compatible laptop model.
- Filter by stock availability, by branch and by low stock.

### 3.12 Bulk import and export [NEW]

- Downloadable CSV templates per category (laptops, parts, accessories), each with that category's full specification columns.
- Import validates every row, reports errors with row numbers, and supports a dry run before committing.
- Opening balances: existing stock is loaded through an "opening balance" import that writes stock ledger movements, never by editing balances directly.
- Exports are available for products, stock balances and ledger history, and every export is audited.

### 3.13 Validation rules

- Quantities are positive whole numbers unless the unit of measure allows decimals.
- Required fields depend on category, as set out above.
- Prices cannot be negative. A selling price below cost triggers a warning.
- Enumerated fields (condition, grade, RAM type, storage type) use managed lists, not free text.
- Stock balances cannot go negative.

## 4. Warehouse requirements

Follow the specification's receiving workflow and GRN, with these additions:

- **[NEW] Inspection and grading on receipt** for used and refurbished laptops, recorded per receipt line (grade, test results, condition notes and photos). Scheduled for Sprint 9.
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
6. An unresolved shortfall stays linked to the transfer as a discrepancy until resolved by one of: return to sender, confirm loss, record damage, or another authorised disposition. Any admin role (Super Admin, Warehouse Admin, Branch Admin) may resolve it; front staff cannot. Basic resolution of dispatch shortfalls is in the MVP; branch-to-branch transfers follow in Sprint 4.
7. **[NEW]** Transfers not confirmed within a configurable time (suggested 48 hours) trigger a reminder and appear on dashboards as overdue.
8. **[NEW]** Discrepancy resolution paths are part of the acceptance criteria, since partial receipts will occur from day one.

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
- POS hardware integration (tills, receipt printers and scanners connected directly to the sales screen) is a later update, not scheduled.

## 7. Adjustments, returns and reversals

- Adjustment types: damaged, expired, count variance, found stock, entry correction, restockable return.
- Every adjustment needs a mandatory reason and, where policy requires, approval.
- Reversals create a separate compensating movement linked to the original, which stays visible.
- Warranty and repair tracking is deferred with per-piece records (section 3.6).
- **[NEW] Stock counts:** a basic stocktake workflow (count, compare, approve variances) is planned for after launch.

## 8. Notifications, dashboards and reports

**Notifications** (in app only; email and SMS are deferred): incoming transfers, transfer status changes, access requests and decisions, low stock, discrepancies, overdue transfers, and pending approvals. Notifications never grant permissions or approve anything.

**Dashboards** follow the specification (Super Admin, Warehouse Admin, Branch Admin, Front Staff).

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
- **Lead capture and AI agent:** consume the same API so recommendations reflect live stock.
- POS integration and barcode hardware are a later update, not scheduled.

## 11. Non-functional requirements

- **Security:** hashed passwords, secure sessions, login rate limiting, HTTPS, server-side permission checks, secrets kept out of code.
- **Data integrity:** database transactions and row-level locking for every stock change, idempotency keys to prevent duplicate submissions, timezone-aware timestamps (Africa/Accra).
- **Usability:** responsive layout that works on phones and tablets, since branch staff will often use them.
- **Performance:** search results and the product list should respond within about two seconds under normal load.
- **Reliability:** automated daily backups, a tested restore process, error monitoring, and a staging environment before production.
- **Testing:** automated tests for permissions, branch isolation (with the cross-branch exception), partial receiving, concurrency and reversals.
- **DevOps:** the project has no established setup, so allow time for hosting, deployment, migrations, rollback and monitoring.

## 12. Phasing and timeline

No calendar dates apply. The work runs in 9 sprints of 5 working days, tracked by sprint and day number. The full plan, goals and release tags are in [1-Overview-and-Sprints.md](1-Overview-and-Sprints.md), section 4.

- **MVP (Sprints 1 and 2, `v1.0.0`):** login, users and branches, items and stock, warehouse receiving, dispatch and branch receiving with basic shortfall resolution, sales, find with cross-branch lookup, CSV import with opening balances, dashboard and activity log.
- **Phase 1 complete (Sprints 3 to 5, `v1.3.0`):** full specifications, warranty terms, product and variant split, images and spec sheets, branch-to-branch transfers, adjustments and reversals, notifications, branch access requests, multi-role assignment and role switching, price history, activity screens.
- **Phase 2 complete (Sprints 6 to 9, `v2.4.0`):** price lists and overrides, discounts, receipts, customer details, split payments, daily close, returns and refunds, reports and exports, website API, inspection and grading, supplier records.
- **Later, not scheduled:** barcodes and labels, scanning, per-piece records and serials, POS integration, bundles, stocktake workflow, repair tracking, email or SMS notifications, offline mode.

## 13. Acceptance criteria

The acceptance criteria for each release point (MVP, Phase 1 complete, Phase 2 complete) are in Backend section 13, Frontend section 10 and DevOps section 12.
