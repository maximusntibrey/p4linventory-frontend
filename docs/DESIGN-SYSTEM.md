# Design system

The UI is **Mantis-based MUI** (Mantis Free React Admin Template, MIT, see `NOTICE`). Use the shared theme and shared components. No ad-hoc styles, no raw colours, no new UI libraries. New screens are composed from existing Mantis patterns; new components are added to the shared library first.

Template-first: the reference source is `reference/mantis/vite/` (local, gitignored). Copy from it as it is, then change content. Vendored template files stay JS/JSX; our own code is TypeScript. Dark mode is out of scope.

Legacy (removed in the last UI run, see TASKS Part UI): Tailwind utilities, `src/components/ui/*`, `src/styles/tokens.css`, `lucide-react`. They coexist only so unmigrated screens keep working. Tailwind runs without preflight.

## Theme (`src/themes/`, the only place colours live)

| File | Role |
|---|---|
| `themes/index.jsx` | `ThemeCustomization`: breakpoints, CSS variables, typography, palette, component overrides |
| `themes/theme/index.js` | Brand colour scales (orange, navy) and status colours |
| `themes/palette.js` | Slate-tinted neutrals, text, divider and background roles |
| `themes/typography.js` | Fonts: Bebas Neue for h1 to h4 (headings, brand, big numbers), Inter for the rest. Mantis sizes and spacing kept; the display face gets weight 400 and 0.02em tracking for legibility |
| `themes/overrides/*` | Component overrides (Drawer navy, table head tint, selected row tint, and the template's own) |
| `themes/mui-augment.d.ts` | Types for the brand palette keys in our TypeScript |

Fonts are self-hosted with `@fontsource/bebas-neue` and `@fontsource/inter` (imported in `src/main.tsx`).

## Colour roles

| Role | Value | Where |
|---|---|---|
| Orange accent `primary[400]` | #FF6A00 | Active bar and icon in the drawer, chart highlight, graphics. Not text or focus on white (2.87:1) |
| Orange main `primary.main` | #C2410C | Filled buttons with white text, links, focus ring, text on tints (5.18:1 on white) |
| Orange dark `primary.dark` | #9A3412 | Button hover |
| Orange tint `primary.lighter` | #FFF7ED | Selected table rows, soft chips |
| Navy `navy.main` | #1E2A3A | Drawer background, page text, table head text, auth brand panel |
| Navy dark `navy.dark` | #141C27 | Drawer hover row, drawer border |
| Navy 400 | #2F3F54 | Drawer active row fill |
| Navy tint `navy.lighter` | #F1F4F8 | Drawer text, table head background |
| Neutrals `grey` | #FFFFFF to #0F1620, slate tinted | Cards white, page background #F8FAFC, divider #E6EBF1, secondary text #64748B |
| Success, warning, danger, info | green, amber (dark gold), red, blue Ant scales; `main` is one or two steps darker than the template so white-on-main and main-on-tint pass AA | Status chips and messages. Orange is never a status colour |

Header: white with the Mantis border, navy text and icons. Cards: white with the Mantis border and shadow. Charts: navy main series, orange highlight, slate tints.

## Contrast (WCAG AA), tested numerically

`src/themes/palette.test.ts` computes each pair from the live palette and fails below the minimum (4.5 normal text, 3 large text and graphics). Current values:

| Pair | Foreground | Background | Ratio | Min |
|---|---|---|---|---|
| body text on cards | #1E2A3A | #ffffff | 14.51 | 4.5 |
| body text on page background | #1E2A3A | #F8FAFC | 13.87 | 4.5 |
| secondary text on cards | #64748B | #ffffff | 4.76 | 4.5 |
| secondary text on page background | #64748B | #F8FAFC | 4.55 | 4.5 |
| white on primary button (filled orange) | #fff | #C2410C | 5.18 | 4.5 |
| white on primary button hover | #fff | #9A3412 | 7.31 | 4.5 |
| primary text/link on white | #C2410C | #ffffff | 5.18 | 4.5 |
| primary text on soft orange tint (chip, selected row) | #C2410C | #FFF7ED | 4.88 | 4.5 |
| body text on selected row tint | #1E2A3A | #FFF7ED | 13.66 | 4.5 |
| accent orange on white (decorative graphics only; never text or focus ring) | #FF6A00 | #ffffff | 2.87 | 2.8 |
| drawer text on navy | #F1F4F8 | #1E2A3A | 13.15 | 4.5 |
| drawer muted group label on navy | #94A3B8 | #1E2A3A | 5.66 | 4.5 |
| drawer text on hover row (darker navy) | #F1F4F8 | #141C27 | 15.54 | 4.5 |
| drawer active text (white) on lighter navy | #fff | #2F3F54 | 10.71 | 4.5 |
| drawer active icon/accent bar (orange) on lighter navy | #FF6A00 | #2F3F54 | 3.73 | 3 |
| drawer accent orange on navy | #FF6A00 | #1E2A3A | 5.05 | 3 |
| table header text (navy) on light navy tint | #1E2A3A | #F1F4F8 | 13.15 | 4.5 |
| body text on table header tint | #1E2A3A | #F1F4F8 | 13.15 | 4.5 |
| error: white on filled error | #fff | #cf1322 | 5.57 | 4.5 |
| error: soft chip text on tint | #cf1322 | #fff1f0 | 5.07 | 4.5 |
| error: dark text on tint | #a8071a | #fff1f0 | 7.04 | 4.5 |
| warning: white on filled warning | #fff | #874d00 | 6.79 | 4.5 |
| warning: soft chip text on tint | #874d00 | #fffbe6 | 6.53 | 4.5 |
| warning: dark text on tint | #613400 | #fffbe6 | 10.10 | 4.5 |
| success: white on filled success | #fff | #237804 | 5.59 | 4.5 |
| success: soft chip text on tint | #237804 | #f6ffed | 5.44 | 4.5 |
| success: dark text on tint | #135200 | #f6ffed | 9.15 | 4.5 |
| info: white on filled info | #fff | #0958d9 | 6.16 | 4.5 |
| info: soft chip text on tint | #0958d9 | #e6f4ff | 5.50 | 4.5 |
| info: dark text on tint | #003eb3 | #e6f4ff | 8.01 | 4.5 |

## Components (shared library)

| Component | Path | Use |
|---|---|---|
| `MainCard` | `components/MainCard.jsx` (+ `.d.ts`) | Every card; header title and secondary action |
| `AnalyticEcommerce` | `components/cards/statistics/` | Template stat card (title, number, trend chip). Real trend chips only with real prior-period data |
| `StatCard`, `PanelCard`, `CardBody` | `features/dashboard/blocks.tsx` | Dashboard stat, chart and list cards with loading, error, empty and "Not available yet" states |
| `@extended/*` | `components/@extended/` | Avatar, Breadcrumbs, IconButton, Dot, Transitions, AnimateButton |
| `Logo` | `components/logo/` | Mark + wordmark (drawer), mark only when collapsed |
| `Field` | `components/Field.tsx` | Label, input, hint and error for forms (InputLabel, OutlinedInput, FormHelperText) |
| `AuthLayout` | `components/AuthLayout.tsx`, `sections/auth/AuthWrapper.jsx` | Navy brand panel and white form (desktop), navy strip above the form (mobile) |

## Layout patterns

- Shell: `layout/Dashboard` (Header, Drawer, Footer, content). The drawer is permanent and collapsible (mini) from `lg`, temporary with a hamburger below it. It is open by default from `xl`.
- Menu: `menu-items/index.ts` builds the Mantis menu groups from `/me` (server menu, home links, Audit Logs when offered). Icons come from `@ant-design/icons`. No role logic in the frontend.
- Header: search box (jumps to any menu screen), working-branch chip, notification bell (disabled: "No notifications yet"), profile menu (name, login id, role, home location, working branch, switch branch, change password, log out).
- Page: `Grid container` with `rowSpacing` 4.5 and `columnSpacing` 2.75 as in the Mantis dashboard; cards are `MainCard`.

## Breakpoints (Mantis)

xs 0, sm 768, md 1024, lg 1266, xl 1440. Drawer: temporary below lg, mini at lg, open at xl. Stat cards: 2 per row below md, 4 per row from md. Charts and lists: full width below md, 2 per row from md.

## Dashboard card catalogue

Card, who sees it (from the server's permission list, never from a role name), data source, status. "Planned" cards render an empty state ("Not available yet", "Coming soon") and no numbers.

| Card | Shown when | Data source | Status |
|---|---|---|---|
| Units in stock | dashboard returns `stock_per_location` (SA, WA) | `GET /dashboard/`, sum of `on_hand` | live |
| Low stock items | `dashboard.view` | `GET /dashboard/` `low_stock_count` | live |
| Today's sales (count and amount) | `sales.record` | `GET /sales/` 7-day page, summed in whole pesewas; "Not available yet" if the 7 days do not fit one page | live (needs a daily summary at scale) |
| Waiting receipts | `dispatches.waiting` and `dashboard.view` | `GET /dashboard/` `waiting_dispatches` | live |
| Open shortfalls | `shortfalls.resolve` | `GET /shortfalls/?status=open` `count` | live |
| In transit | `dashboard.view` | `GET /dashboard/` `in_transit_dispatches` | live |
| Stock value at cost | `items.view_cost` | none (needs a value total) | planned |
| Items without a selling price | `items.manage` | none | planned |
| Sales last 7 days (area chart) | `sales.record` | `GET /sales/` grouped by Accra day | live (same limit as Today's sales) |
| Stock by location (bar) | dashboard returns `stock_per_location` | `GET /dashboard/` | live |
| Warehouse and branch stock (donut) | dashboard returns `stock_per_location` | dashboard and warehouse list | live |
| Top selling items | `sales.record` or `dashboard.view` | none | planned |
| Quick actions | any of the linked permissions | links only | live |
| Low stock (list) | `dashboard.view` | `GET /dashboard/` `low_stock` | live |
| Recent dispatches | `dispatches.view` | `GET /dispatches/?page_size=5` | live |
| Recent sales | `sales.record` | `GET /sales/` | live |
| Cancelled sales today | `sales.cancel` | none | planned |

Audit logs stay off the dashboard. Every card has a loading skeleton, an empty state and an error state with retry. Backend gaps are listed in TASKS under "Dashboard backend needs".

## How to add a screen

1. Pick the closest Mantis pattern in `reference/mantis/vite/src` (page, `MainCard`, table, form) and copy it as it is.
2. Compose with MUI components and `sx` using theme roles (`primary.main`, `text.secondary`, `navy.main`, `divider`). No hex, no `style=`, no Tailwind classes.
3. Put reusable pieces in `src/components` (TypeScript for ours) before using them in a screen.
4. Register the route in `src/routes.tsx` with `RequirePermission`; the menu entry comes from `/me`.
5. Test: component (RTL), axe, keyboard, 360 px, MSW-backed. Run `npm run check`.
