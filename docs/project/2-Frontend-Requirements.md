# Frontend Requirements

**Status:** Current. Applies to the `p4linventory-frontend` repo only.

> **Document set.** [README](README.md) · [1 Overview and Sprints](1-Overview-and-Sprints.md) · [2 Frontend](2-Frontend-Requirements.md) · [3 Backend](3-Backend-Requirements.md) · [4 DevOps](4-DevOps-Requirements.md) · [TASKS](../../TASKS.md) · [SKILLS](../../SKILLS.md) · [Gaps and actions](PROJECT_GAPS_AND_ACTIONS.md). Background only: [5 Detailed Requirements](5-Detailed-Requirements.md), [6 Functional Workflow Specification](6-Functional-Workflow-Specification.md).

Everything the user sees and does. Business rules, data, permissions, stock logic and security are in the Backend tab ([3-Backend-Requirements.md](3-Backend-Requirements.md)). Shared decisions, the API contract and the sprint overview are in the Overview and sprints tab ([1-Overview-and-Sprints.md](1-Overview-and-Sprints.md)). Step-by-step tasks are the `F` steps in [TASKS.md](../../TASKS.md). The frontend never decides a business rule: it shows what the API allows and reports what the API rejects.

## 1. Principles

- One task per screen, with one big primary button.
- Few fields, plain words, no clutter, no jargon.
- Mobile-first, because branch staff will often use phones or tablets. It also works well on desktop.
- Every icon has a short text label beside it, so nobody has to guess.
- The same simple layout and behaviour for every role.

## 2. Look and feel

- **Colour:** white background, grey text and borders, and one accent colour for buttons and links. Green, amber and red appear only for status (in stock, low, out, error).
- **Type:** one clean font, generous spacing, and large tap targets (at least 44 px).
- **Icons:** one simple outline set (Lucide is a good fit) used everywhere.
- **Lists:** tables become simple cards on phones.
- **Feedback:** short confirmation messages, friendly empty screens, and errors in plain words, for example "That quantity is more than the stock at this branch."
- **Mode:** light mode only for now. Dark mode can come later.

## 3. Layout and navigation

- **Top bar:** current branch name, the user's ID, a switch-branch icon, and logout.
- **Navigation:** a bottom tab bar on phones and a slim icon rail on desktop, with at most 5 items per role. Menus are built from what the API says the user may do.

| Role | Menu |
|---|---|
| Front Staff | Sell (cart), Find (magnifier), Stock (boxes), Receive (inbox) |
| Branch Admin | Home (house), Sell, Find, Stock, Receive |
| Warehouse Admin | Home, Items (tag), Receive stock (inbox), Dispatch (truck), Find |
| Super Admin | Home, Items, Warehouse (boxes), Branches (store), Users (people). The activity log (clock), Sell, Find and Receive are opened from Home. |

Other icons: arrows for switching branch, bell for notifications (later).

**Role switcher (Sprint 5).** A user with more than one role sees a role switcher in the top bar. Switching changes the whole view to the selected role: its menu, its home dashboard and its screens. The top bar always shows the role in use.

## 4. Screens

### 4.1 Login and branch selection (MVP)

- Login form with user ID and password, clear error messages, and a message when too many attempts are made.
- Front staff then pick their working branch from the branches they may use. The top bar shows it, and the switch icon changes it at any time. Other users go straight to their default workspace.

### 4.2 Dashboard (MVP, basic)

- A few big numbers (stock per branch, quantities in transit, low stock) and a short recent-activity list. No charts in the MVP.

### 4.3 Items (MVP, specifications added from Sprint 3)

- **List:** search box, filters (category, brand, condition, status), pagination, status badges, and cards on phones. Cost price is shown only when the API returns it.
- **Add and edit:** a category-driven form. Choosing a category and sub-type loads that category's field definitions from the API and shows only those fields, grouped in collapsible sections. Inline validation, save as Draft, activate when valid, warnings for duplicates and for a selling price below cost.
- **Images:** one image in the MVP; several with a primary image, plus spec-sheet documents, from Sprint 3. Clear messages for wrong type or size.
- **Warranty terms (Sprint 3):** warranty type (manufacturer, shop or none) and period in months on the item form.

### 4.4 Stock (MVP)

- Stock by location (the warehouse and each branch) with a low-stock flag and search.

### 4.5 Find (MVP)

- Search by name, SKU, brand or model. The result card shows stock at my branch, plus a list of other branches with branch name and quantity only.

### 4.6 Receive stock into the warehouse (MVP, Warehouse Admin)

- Supplier name, then item lines (search an item, enter quantity and cost), review and confirm. A success message shows the receipt reference.

### 4.7 Dispatch to a branch (MVP, Warehouse Admin)

- Choose the branch, add lines with quantities (showing what is available), and confirm. A list shows each dispatch and its status.

### 4.8 Branch receiving (MVP)

- A list of what is waiting at the working branch. Opening one shows each line with the quantity received, pre-filled with the quantity sent, a "Received all" shortcut, and a note for any shortfall. Shortfalls are clearly highlighted.
- Open shortfalls are listed with a resolve action (return to sender, confirm loss, record damage) with a mandatory note. The action is shown to admin roles (Super Admin, Warehouse Admin, Branch Admin) when the API allows it, never to front staff. (MVP, from Sprint 2.)

### 4.9 Sell (MVP)

- Search and select items, enter quantities, see a running list and total, choose a payment method, and confirm. About three steps. A clear message appears if a quantity is more than the stock available.

### 4.10 Sales list and cancel (MVP)

- Sales for the branch, with a cancel action for Super Admin and Branch Admin that asks for a reason. Cancelled sales show a badge. Sale statuses are Completed, Cancelled, Refunded and Exchanged (the last two from Sprint 7).

### 4.11 Import (MVP)

- Upload a CSV, see a preview and an error report with row numbers, then confirm the import.

### 4.12 Users and branches (MVP, Super Admin)

- Lists and add or edit forms. The auto-generated ID is shown after a user is created. Actions to deactivate a user and reset a password, and branch management.

### 4.13 Activity log (MVP)

- A simple list, filterable by user, branch, action and date.

### 4.14 Screens added in later sprints

Branch transfers (send and receive, with shortfalls), stock adjustments and reversals with approval, a notification centre with a badge, branch access requests and role assignment, price history, price lists and branch overrides, discounts, receipts (print and share), customer details, split payments, daily close, returns and refunds, reports, inspection and grading on receiving, supplier records, and API key management.

## 5. Forms and messages

- Inline validation next to each field, with plain-language messages taken from the API's errors.
- Confirmation messages after saving, friendly empty states, and a confirm step for risky actions (cancel a sale, deactivate a user).
- Session expiry sends the user to login with a clear message, and no work is lost silently.

## 6. Responsive design and accessibility

- Works at 360 px phone width, on tablets and on desktop, with no sideways scrolling.
- Tap targets of at least 44 px, full keyboard navigation, readable colour contrast, and status never shown by colour alone.
- Every icon has a text label. English only for now.

## 7. Performance and reliability

- Lists are paginated and search is debounced. Loading states are shown, and errors offer a retry.
- No business logic is duplicated in the frontend.

## 8. Frontend tests

- **Component tests:** the category-driven item form and its validation, lists and filters, the sell flow, and the receiving flow.
- **End-to-end smoke test against staging:** log in, pick a branch, add an item, receive stock, dispatch, receive at the branch, sell, and find.
- **UI checks:** no sideways scroll at 360 px, every icon labelled, main flows work with the keyboard alone.
- Tests run against mock responses in CI, and against the real backend at the end of each sprint.

## 9. Frontend sprint plan (5-day sprints)

### Sprint 1 (Days 1 to 5)

- **Day 1:** UI kit (colours, spacing, icon set, buttons, cards, form fields, status badges, top bar, navigation); repo, environments and CI; app shell; API client built from the contract, with mock responses.
- **Day 2:** login screen, layout, route guards, menu per role.
- **Day 3:** working-branch selection and switching; branch management screens; user management screens; dashboard shell.
- **Day 4:** item list, add and edit screens (form built from the item field definitions, one image); stock screen.
- **Day 5:** receive stock, dispatch and branch receiving screens; screens for what is waiting at each branch.

### Sprint 2 (Days 6 to 10)

- **Day 6:** sell screen, sales list, find screen, CSV import screen, cancel sale action.
- **Day 7:** dashboards and activity log screens; shortfall list and resolve screen for dispatch shortfalls.
- **Day 8:** component and end-to-end tests; bug fixes from testing.
- **Day 9:** UI consistency pass, accessibility check, list performance check, and fixes.
- **Day 10:** short user guide and walkthrough, and checks on the live frontend. MVP release (`v1.0.0`).

### Sprint 3 (Days 11 to 15)

- **Day 11:** fixes from real MVP use and UI polish from feedback.
- **Day 12:** laptop specification form sections and laptop filters.
- **Day 13:** part specification forms, compatibility picker, and "parts for laptop model X" search.
- **Day 14:** accessory forms and filters; warranty terms on the item form, and the warranty end date shown on the sale and in the sales list.
- **Day 15:** product and variant screens; several images with a primary image, and spec-sheet upload. Release `v1.1.0`.

### Sprint 4 (Days 16 to 20)

- **Day 16:** branch transfer screen: send.
- **Day 17:** branch transfer screen: receive, with shortfalls; the Sprint 2 resolve screen extended to branch transfers.
- **Day 18:** stock adjustment and reversal screens with approval.
- **Day 19:** notification centre and badge.
- **Day 20:** buffer, regression and release. Release `v1.2.0`.

### Sprint 5 (Days 21 to 25)

- **Day 21:** branch access request and approval screens.
- **Day 22:** role assignment screen, and the role switcher for users with more than one role.
- **Day 23:** price history, manage prices, and below-cost warning display.
- **Day 24:** user activity and stock movement history screens.
- **Day 25:** accessibility review, UI test pass, documentation and release `v1.3.0`. Phase 1 complete.

### Sprint 6 (Days 26 to 30)

- **Day 26:** price list screens.
- **Day 27:** branch price override screens.
- **Day 28:** discount entry in the sell screen.
- **Day 29:** receipt view (print and share), including the warranty end date for warranty-bearing items.
- **Day 30:** customer details in the sell screen. Release `v2.1.0`.

### Sprint 7 (Days 31 to 35)

- **Day 31:** split payment entry.
- **Day 32:** daily close screen.
- **Day 33:** returns and refunds screens.
- **Day 34:** sales history filters and role dashboards.
- **Day 35:** polish and release `v2.2.0`.

### Sprint 8 (Days 36 to 40)

- **Day 36:** sales reports.
- **Day 37:** stock reports.
- **Day 38:** receipt, supplier, transfer and shortfall reports.
- **Day 39:** adjustment and reversal history, stock valuation and margin.
- **Day 40:** export buttons and release `v2.3.0`.

### Sprint 9 (Days 41 to 45)

- **Day 41:** API key management screen.
- **Day 42:** inspection and grading on the receiving screen.
- **Day 43:** buffer (warranty terms moved to Sprint 3).
- **Day 44:** supplier screens.
- **Day 45:** polish, final review and release `v2.4.0`. Phase 2 complete.

## 10. Frontend acceptance criteria

### MVP

- Each role sees only its own menu, and the interface works at 360 px width.
- A user can log in, pick a branch (front staff), add and edit an item, see stock, receive stock, dispatch, receive at a branch, sell, cancel a sale (allowed roles), resolve a dispatch shortfall (allowed roles), find an item with other branches' quantities, import a CSV and view the dashboard and activity log.
- Every icon has a label, and the main flows work with a keyboard alone.

### Phase 1 complete

- All item specification forms (laptops, parts, accessories), including warranty terms, several images and spec sheets, are built from the API's field definitions and filter correctly.
- A user with more than one role can switch role, and the whole view changes to that role.
- Transfers, adjustments, notifications and access requests work end to end through the screens.

### Phase 2 complete

- Selling screens cover price lists, discounts, receipts, customer details, split payments, daily close and refunds.
- Reports and exports are available to the right roles, and API key management works.
