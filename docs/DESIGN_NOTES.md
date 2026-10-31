# Design notes: the "Ledger" language

An audit of what already exists in `/frontend`. Everything new in the app is built from this; no
second UI library, no new colours or fonts.

Source of truth: `frontend/src/index.css` (tokens), `frontend/src/components/ui/*` (kit),
`frontend/src/pages/design-system/*` (live showcase at `/design-system`).

## Idea

A billing tool that reads like a printed statement. White **sheets** lie on a **Stone** canvas,
**Ink** carries text and every primary action, and **Cobalt** (the carbon-copy blue) is spent only on
focus, links, selection, the current route, the headline figure and the first data series.
Structure comes from **rules, not shadows**: hairlines between rows, a heavy Ink rule (`border-t-2
border-rule`) where a new section starts. One shadow (`shadow-overlay`) for things that float.

## CSS approach

- **Tailwind CSS v4** via `@tailwindcss/vite`; no `tailwind.config.js`. Tokens are declared in CSS
  (`@theme`, `@theme inline`, `@utility`).
- **shadcn/ui-compatible variable names** (`components.json`: style new-york, baseColor slate,
  cssVariables, iconLibrary lucide). Components are hand-written in `.jsx`, not generated: there is
  **no Radix**. Overlays use native elements (`<dialog>`, `<select>`).
- `cn()` in `src/lib/utils.js` = `clsx` + `tailwind-merge`.
- Path alias `@/` → `src/`.

### Three token layers
1. **Raw scales** (`--color-stone-50…950`, `--color-cobalt-50…900`), for brand moments only.
2. **Semantic tokens** on `:root` and `.dark`. Components use only these, so dark mode is a token
   swap.
3. **`@theme inline`** maps them to utilities: `bg-card`, `text-muted-foreground`, `border-rule`,
   `bg-success-soft`, …

## Colour tokens (semantic)

| Group | Tokens | Use |
|---|---|---|
| Surfaces | `background` (canvas), `card` (sheet), `popover`, `sunken` (wells, footers, hover rows) | Page / card / dialog / segmented wells |
| Text | `foreground`, `muted-foreground`, `subtle-foreground` | Body / secondary / tertiary (counts, group labels) |
| Actions | `primary` (+`-hover`, `-foreground`), `secondary` (+`-hover`), `danger` (+`-hover`, `-foreground`) | Ink fill / sheet with edge / red |
| Accent | `accent`, `accent-soft`, `accent-soft-foreground`, `link`, `ring` | Cobalt: focus, links, selection, current nav item |
| Lines | `border` (hairline), `input` (control edge), `rule` (heavy Ink rule) | |
| Inverse | `inverse`, `inverse-foreground`, `inverse-muted`, `inverse-{success,warning,danger,accent}` | Toasts and chart tooltips |
| Status | `{success,warning,danger,info}` + `-soft` + `-soft-foreground` | Solid markers / tinted bg / readable text on tint |
| Charts | `chart-1` (cobalt), `chart-2` (saffron), `chart-3` (neutral), `chart-grid`, `chart-axis` | Recharts via `var(--chart-*)` |

The only non-semantic colours in the kit are the Avatar identity palettes (Tailwind
`orange/emerald/rose/amber-100…` and the stone/cobalt scales). They mark identity, not status.

## Type

- **Archivo** (variable width 100–125 %, weight 400–700) for UI text; **JetBrains Mono** (400/500/600)
  for every figure, ID, date and label. Both load from Google Fonts in `index.html`.
- Body is 14 px / 22 px, `font-feature-settings: 'ss01'`. Working text in controls/tables is
  `text-[0.8125rem]` (13 px).
- Scale utilities (named `type-*` so they never clash with colour utilities in `cn`):

| Utility | Spec | Use |
|---|---|---|
| `type-display` | clamp 40–80 px, 650, 125 % wide | Marketing only (design-system masthead) |
| `type-h1` | clamp 26–32 px, 620, 115 % wide | Page title |
| `type-h2` | 18 px, 600 | Dialog title, empty-state title |
| `type-h3` | 14 px, 600 | Card title, form-group title |
| `type-figure` / `type-figure-lg` | mono 28 px / clamp 32–44 px | KPI values |
| `type-body`, `type-caption` | 14 px / 12 px | |
| `type-label` | mono 11 px, uppercase, 0.06em | Table heads, badges, group labels, `<dt>` |

Numbers: always `font-mono tabular-nums`, right-aligned in tables (`numeric` prop).

## Spacing, radius, elevation, motion

- 4 px base (Tailwind default). Screens mostly use 2, 3, 4, 6 (8–24 px). Card padding `p-4 sm:p-5`;
  page gutters `px-4 sm:px-6`.
- `--radius: 3px`. `rounded-sm` 2 px (badges, checkbox), `rounded-md` 3 px (buttons, inputs),
  `rounded-lg` 4 px (cards), `rounded-xl` 6 px (dialogs, shells). Near-square everywhere.
- Edges: `border` hairline on cards; `border-t-2 border-rule` to open a section/totals;
  `divide-y` for ruled lists. **No card shadows.** `shadow-overlay` only on dialogs/toasts/tooltips.
- Motion: `--ease-settle`, `animate-dialog-in` (160 ms), `animate-fade-in` (140 ms), 75–150 ms colour
  transitions; reduced-motion zeroes all of it.

## Light / dark

- `.dark` class on `<html>` (`@custom-variant dark`). `index.html` applies the saved theme before
  first paint; `src/hooks/use-theme.js` (`light | dark | system`, key `brightloop-theme`) keeps it in
  sync. `ThemeToggle` (`src/components/theme-toggle.jsx`) is a 3-way radiogroup.
- `color-scheme` follows the theme so native controls (date pickers, scrollbars) match.

## Icon set

`lucide-react` only. Sizes come from the parent (`[&_svg]:size-4` in buttons, `size-3.5` in small
contexts). Decorative icons get `aria-hidden="true"`.

## Existing components (`src/components/ui`)

| Component | API notes |
|---|---|
| `Button` | `variant`: primary, secondary, tertiary, danger, danger-quiet, link. `size`: sm, md, lg, icon, icon-sm. `loading` shows a spinner and disables. `as={Link}` for router links. Surface lives on `::before` (override with `hover:before:bg-*`). One primary per view. |
| `Badge` | Square "stamp", mono uppercase. `tone`: neutral, ink, accent, success, warning, danger, info, outline. `dot` adds a square marker. |
| `StatusBadge` | Maps a lifecycle status → tone (draft neutral, quotation info, confirmed ink, active success, paused warning, closed outline, paid success, cancelled danger). **Extended** in phase 1 for overdue/partially paid and discount states. |
| `Card`, `CardHeader` (`action` slot), `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (sunken, ruled) | Sheet with hairline edge. |
| `Field` | Label + single control + hint/error; wires `id`, `aria-invalid`, `aria-describedby`. |
| `Input` (`leading`/`trailing` affix), `Select` (native), `Textarea`, `Checkbox` (`label`, `description`), `Switch` (`checked`/`onCheckedChange`), `Label` (`required` star) | Shared look in `control-styles.js`; focus = Cobalt edge, invalid = danger edge. |
| `Dialog` | Native `<dialog>`: focus trap, Esc, inert background. `open`, `onClose`, `title`, `description`, `footer`. |
| `Tabs`, `TabsList` (`variant` segmented \| underline), `TabsTrigger`, `TabsContent` | Arrow-key navigation. Segmented = filters/view switches, underline = page sections. |
| `Table`, `TableHeader` (heavy rule), `TableBody`, `TableRow`, `TableHead`/`TableCell` (`numeric`) | Wrapper scrolls horizontally. |
| `MetricStrip` + `Metric` | KPI row on one sheet split by hairlines; `featured` (Cobalt marker, larger figure); `delta` with arrow + sr-only text. |
| `Progress` | Flat square meter; `tone` ink/accent/success/warning/danger. |
| `Alert` | Tinted strip: `tone`, `title`, `action`. |
| `EmptyState` | Ruled "empty ledger page" with icon, title, description, `action`. |
| `Skeleton`, `Spinner` | Loading. |
| `Avatar` | Initials with an identity colour hashed from the name. |
| `ThemedToaster` | **sonner** with `unstyled` + inverse surface; already mounted in `index.jsx`. This is the toast library. |
| `Logo`, `LogoMark`, `Wordmark` | Brand. |

## Layout patterns (from `PatternsSection.jsx` and the showcase page)

- **App shell**: left rail `w-52 border-r bg-card` with logo bar `h-12 border-b`; grouped nav with
  `type-label text-subtle-foreground` group headings; items `h-8 rounded-md px-2.5 text-[0.8125rem]`,
  the current item `bg-sunken font-medium` with a 2 px Cobalt bar on the left (`before:bg-accent`),
  optional mono count on the right; footer with user Avatar + name + role.
- **Topbar**: `h-12 border-b bg-card`, breadcrumb (`Group / Page`, separator in
  `text-subtle-foreground`), search `Input` with leading icon, actions on the right.
- **Page head**: `type-h1` title, `text-[0.8125rem] text-muted-foreground` subtitle, mono meta
  on the right (`font-mono text-xs`).
- **Content grid**: `@container` with `@md:` / `@4xl:` breakpoints, `gap-4`, `space-y-4`.
- **Data table on a card**: toolbar strip `min-h-14 border-b px-3 py-2.5` (search left, filters and
  Export right); while rows are selected it swaps to "N selected" + bulk buttons. Selected rows
  `bg-accent-soft/60`. Footer `border-t` with mono "1–25 of 128" and Previous/Next secondary buttons.
- **Forms**: `FormGroup` rows (`lg:grid-cols-[11rem_minmax(0,1fr)]`: title and description on the
  left, a 2-column field grid on the right), divided by `divide-y`; sticky-feeling footer
  `border-t bg-sunken/60` with a caption on the left and Cancel (tertiary) / secondary / primary on
  the right.
- **Summary / totals**: `dl` in mono; the total row opens on `border-t-2 border-rule`.
- **Choice rows**: radio list inside `divide-y rounded-md border`, the checked row `bg-accent-soft/70`.
- **Charts**: Recharts in a `Card`; axes without lines/ticks, `--chart-axis` mono 11 px ticks,
  `--chart-grid` horizontal grid only, compact INR tick labels, inverse-surface tooltip, legend as
  small squares, `isAnimationActive={false}`, stepped area for MRR, stacked bars for plan split. A
  segmented "Chart / Table" switch offers an accessible table view.
- **Dialogs**: tertiary "keep" button + primary or danger confirm; the destructive copy names what is
  destroyed; facts in a ruled `dl`.
- **Toasts**: `toast.success`, `toast.error(title, { description })`, `toast(title, { action })`.

## Existing helpers

- `src/lib/format.js`: `formatCurrency(amount, { compact })` (en-IN INR, 0 decimals),
  `formatPercent`. Phase 1 adds money with paise, dates and status labels here.
- `src/lib/supabase.js`: browser Supabase client (auth only).
- `src/api/client.js`: axios instance with `baseURL = VITE_API_URL ?? '/api'` (interceptors still TODO).
- `@brightloop/shared`: enums (`SUBSCRIPTION_STATUS`, `INVOICE_STATUS`, `PAYMENT_METHODS`, …),
  `PASSWORD_REGEX`, `passwordChecks` (live checklist items), `passwordSchema`.

## Gaps to fill in the same language (phase 1)

Sidebar/drawer shell, PageHeader, server-driven DataTable with sort and pagination, FilterBar with
status chips and date presets, MoneyCell/DateCell, ErrorState, ConfirmDialog, RHF form wrappers,
async EntityCombobox (no Radix: an `Input` + `role="listbox"` popover on the `popover` surface),
LinesEditor, StatusStepper, ActivityTimeline, KpiCard (built on `Metric`), ChartCard (the chart
chrome above), PasswordChecklist, and a menu/drawer for mobile (native `<dialog>`).
