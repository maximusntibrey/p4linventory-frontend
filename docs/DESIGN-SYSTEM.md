# Design system

Rule: **All UI must use the design-system tokens and components. No ad-hoc styles. Any new component is added to the library first.**

- Tokens: `src/styles/tokens.css` (single source of truth; Tailwind 4 `@theme static` plus `:root` variables).
- Components: `src/components/ui/` (import from `components/ui`). Living showcase: route `/design-system` (open in dev; in production only for a user the server marks as working across all branches, that is Super Admin; lazy-loaded).
- Enforcement: `npm run design:check` (part of `npm run check` and CI) fails on raw hex/rgb/hsl colours and inline `style=` props. Allowed exceptions: `src/styles/tokens.css`, `src/assets/**` (logo and SVG files), test files, mocks, and the one helper `style={widthStyle(percent)}` for data-driven widths (progress bars). Offenders that existed before the library live in `scripts/design-token-baseline.json`; it holds **0** violations today and may only shrink. `node scripts/check-design-tokens.mjs --write-baseline` rewrites it (use only to ratchet down).
- Contrast is verified numerically in `src/styles/tokens.test.ts` for every text/background pair listed below.

## Tokens

### Brand (approximations, see note)

No logo file was available. These values were supplied by the owner as the brand look; replace them when the real logo arrives.

| Token | Value | Use |
|---|---|---|
| `primary` | #FF6B00 | Accents, icons, selected-row bar, large graphics. **Never a text fill**: white on it is 2.9:1 and fails AA. |
| `amber`, `amber-light` | #FF8C00, #FFA31A | Secondary accents, logo squares. Decorative. |
| `primary-solid` | #C2410C | Solid fills with white text (5.2:1). Owner decision. Legacy alias `accent`. |
| `primary-solid-hover` | #9A3412 | Hover of solid fills; text on the active pill. Alias `accent-hover`. |
| `primary-soft` | #FFF7ED | Light tint. Alias `accent-tint`. |
| `primary-soft-strong` | #FFEDD5 | Active pill, avatar, selected states. |
| `primary-line` | #EA580C | Borders and the focus ring (3.6:1 on white). Alias `accent-mid`. |
| `on-primary` | #FFFFFF | Text on `primary-solid`, `ink`, `ok`, `bad`, `info` fills. |

Deviation to note: the owner asked for the focus ring in `#FF6B00`; that is 2.9:1 on white and fails the 3:1 non-text rule, so the ring uses `primary-line`.

### Text and neutrals

`ink` #1E293B (deep navy text, 14:1) · `muted` #4B5563 (slate, 7.5:1) · `canvas` #FFFFFF · `surface` #F3F4F6 · `line` #D1D5DB (decorative dividers only) · `control` #6B7280 (input borders, 4.8:1) · `neutral-50..900` (grey scale; 400 and lighter are decorative, never text) · `scrim` (overlay backdrop).

### Semantic

| Tone | Text | Soft background | Note |
|---|---|---|---|
| success | `ok` | `ok-bg` | `ok` is also a solid fill with white text |
| warning | `warn` | `warn-bg` | |
| danger | `bad` | `bad-bg` | |
| info | `info` | `info-bg` | |

Status is never colour alone: always an icon plus text (`StatusBadge`, `DeltaChip`).

### Type, spacing, radius, border, shadow, focus, layers

- Fonts (self-hosted `@fontsource`): `font-display` Bebas Neue for headings, brand and big numbers; `font-sans` Inter for body, forms, tables, IDs and prices. Sizes: `text-display` (2.5 rem), `text-title` (1.75 rem), plus Tailwind's `text-xs` to `text-lg` for body.
- Spacing: Tailwind's 0.25 rem scale; `min-h-target` / `min-w-target` = 44 px minimum tap target (`min-h-11` is the same value).
- Radius: `rounded-sm` 4 px, `-md` 8, `-lg` 12, `-xl` 16, `-pill`.
- Border: `--border-thin` 1 px, `--border-thick` 2 px.
- Shadow: `shadow-card`, `shadow-pop` (menus), `shadow-float` (modals, bulk bar).
- Focus ring: `--focus-ring-width` 3 px, `--focus-ring-color`, `--focus-ring-offset` 2 px, applied globally on `:focus-visible`.
- Layers: `z-(--z-sticky)` 10, `-nav` 20, `-overlay` 40, `-modal` 50, `-toast` 60.

Do: `className="bg-primary-soft text-ink rounded-lg shadow-card"`. Don't: `className="bg-[#fff7ed]"` or `style={{ color: 'red' }}` (the check fails).

## Components

All accept typed props. Every control keeps a 44 px tap target, a visible focus ring and a visible text label.

| Component | Purpose and rules | Don't |
|---|---|---|
| `Button` | Variants `primary`, `secondary`, `ghost`, `danger`; sizes `sm`, `md`, `lg`; `icon` is a leading icon; `loading` disables and shows a spinner, label stays. One primary per view. | An icon-only `Button`; a coloured background by class. |
| `IconButton` | Round or square icon control; `label` is required and shows as a tooltip on hover and focus (or as text with `showLabel`); optional `badge` count. | Omit the label. Use for the notification bell, collapse control. |
| `Input`, `Select` | Bare controls (native select). Always inside `FormField`. | Use without a label. |
| `FormField` | Label, help text, error text with icon; wires `id`, `aria-describedby`, `aria-invalid` through a render prop: `{(c) => <Input {...c} />}`. Errors come from the API in plain language. | Write your own `<label>`. |
| `SearchInput` | Labelled `type="search"`, search icon, optional shortcut hint (`⌘K`). | Placeholder as the only label. |
| `Checkbox` | Whole row is the tap target; `indeterminate` supported. | |
| `Switch` | `role="switch"`, shows On or Off as text. | Colour as the only state. |
| `SegmentedControl` | Native radios. `variant="segments"` compact; `variant="cards"` radio cards with icon and description; `legend`, `required` and `error` give it a visible label and an API error (form use). | More than about five options. |
| `Modal`, `Drawer` | Focus trap, Escape, scroll lock, focus returns to the opener, visible Close button. Modal is a bottom sheet on phones. | Nest dialogs. |
| `ConfirmDialog` | `alertdialog`; cancel is focused first; `tone="danger"` for destructive actions. | Confirm without saying what happens. |
| `Tabs` | WAI-ARIA tabs: roving tabindex, Arrow, Home and End keys; controlled or uncontrolled. | Use as navigation between routes. |
| `StatsStrip` + `StatCard` | One bordered container, 2 cells per row on phones and 4 on desktop; label, optional info button, big Bebas number, `DeltaChip` (arrow plus word, green or red by `good`). | Colour-only deltas. |
| `DataTable` | Typed columns; sortable (`sortValue`, client-side or caller-controlled), row select with tinted row and left accent bar, select-all with indeterminate, `visibleColumns` (+ `ColumnVisibilityMenu`), sticky header, scrolls inside its own region, `state` ready, loading, error (retry) and empty, `AvatarCell` for the first column, optional `pagination`. | Let the page scroll sideways. |
| `Toolbar` | Search, Filter, Sort, Export, view switcher, "Show Statistics" switch, primary action with leading +; every part optional, pass only what the API allows. | Hard-code actions the user may not have. |
| `BulkActionBar` | Floating bottom-centre "N Selected" + actions + Clear; renders nothing at zero. | |
| `Pagination` | Rows per page, numbered pages with First, Previous, Next, Last, and Go to page. | |
| `StatusBadge` | `tone` success, warning, danger, info, neutral, brand; `variant` soft or outline; icon plus text. (The older `components/StatusBadge` maps the API's status words and stays until the page-migration run.) | Colour-only status. |
| `Avatar` | Initials or image; `decorative` when the name is printed beside it. | |
| `EmptyState`, `Skeleton`, `SkeletonText` | Empty message with one action; loading placeholders (put `aria-busy` on the region). | |
| `ToastProvider`, `useToast` | Mount once; `toast({ title, description, tone })`; errors announced assertively, others politely; Dismiss button; auto-dismiss 6 s (0 = stay). | Use a toast for a form error: use `FormField`. |
| `PageHeader` | Bold Bebas `h1`, muted subtitle, actions slot. | Two `h1` per page. |
| `Sidebar` | Grouped sections with small muted uppercase labels, icon plus label items, active item = soft tinted pill with `aria-current`, count badges, header and footer slots (functions get the collapsed state), collapse control. Collapsed keeps each label for assistive tech and as a tooltip. | |
| `Topbar` | Either a global `SearchInput` or `commandSearch` (a button that opens a `CommandPalette`; Ctrl+K or Cmd+K opens it). Global `SearchInput` (Ctrl+K or Cmd+K focuses it from anywhere), round notification bell (`unavailable` makes it a non-interactive button whose label says why), user pill (Avatar, name, email). | |
| `CommandPalette` | Modal search-and-jump list. The caller passes only the places the user may open; Enter opens the first match. | Searching data (use a screen search). |
| `Card` | Bordered surface that groups content; layout classes come from the caller. | Page sections that need a heading only (use `PageHeader`). |
| `LinkButton` | A real link (it navigates) that wears the Button look. | Actions (use `Button`). |
| `TextField`, `SelectField` | `FormField` plus `Input` or `Select` in one component, with react-hook-form `register` friendly props. | Custom layouts (use `FormField`). |
| `StatusWord` | The SKILLS status words (In stock, Low, Active, In transit, Completed, ...) as a `StatusBadge` with icon and text. | Other statuses (use `StatusBadge`). |
| `AppShell` | Layout: sidebar column from md up, menu drawer on phones, skip link, `<main id="main">`. Presentational only; it never decides what the user may see. `embedded` is for the showcase. | Put role checks in it. |
| `Logo` | `variant="full"` or `"mark"` (collapsed sidebar). **Placeholder artwork** in `src/assets/logo.svg` and `logo-mark.svg` (laptop outline, three pixel squares, wordmark "payless4laptop", tagline). The real logo file was not available; replace the two SVGs only. | |

Legacy components in `src/components/` (`Field`, `Select`, `Nav`, `TopBar`, `Pager`, `StatusBadge`, `Card`, and the current `AppShell`) keep working and are replaced route by route in the page-migration run (see TASKS "Design System"). `components/Button` already re-exports the library Button.

## Adding a component

1. Add it to `src/components/ui/` with typed props, tokens only, a 44 px target and a visible label.
2. Export it from `index.ts`, add component, vitest-axe and keyboard tests.
3. Add it to the `/design-system` showcase in every state.
4. Add a row to the table above.
