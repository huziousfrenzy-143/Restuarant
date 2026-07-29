# Restaurant SaaS — Design System

*A design language for an operational tool, not a marketing site. Every screen in this product gets used hundreds of times a day by someone standing at a counter, next to a fryer, or on a scooter — so the design job here is legibility, speed, and consistency under pressure, not spectacle. This document is the single source of truth so the owner dashboard, the POS screen, the kitchen display, the delivery app, and the super admin panel all feel like one product, not five.*

---

## 1. Design principles

1. **Function sets the palette, not fashion.** Color in this product carries meaning (order status, stock level, subscription health) before it carries brand. Never introduce a new color without a semantic job.
2. **Density with air.** Restaurant staff scan tables and tickets fast. Rows should be tight enough to see a full shift's orders without scrolling, but never cramped to the point items collide — spacing is tuned, not generous by default.
3. **One vocabulary everywhere.** An order that's "Preparing" in the Org Admin web app is "Preparing" — same word, same color, same icon — on the Chef's KDS and the Flutter app. Staff should never have to relearn a screen.
4. **Design for the counter, not the desk.** Primary flows (taking an order, marking a ticket done, checking stock) must work on a glare-lit tablet with a greasy thumb. Desk-only flows (reports, ledger, settings) can be denser.
5. **Say what happened, plainly.** No mystery icons, no jargon. "Order #482 marked ready" beats "Status updated."

---

## 2. Foundation tokens

### 2.1 Color

The base is a cool, neutral **stainless-steel** palette (not the warm cream that's become the generic "AI dashboard" default) — it reads professional and lets food-and-fire colors do the talking. Brand primary is a **deep petrol teal** (herbs, freshness, calm) deliberately separated from the **ember/saffron** family, which is reserved entirely for status meaning — so a "Save" button never visually competes with a "this order is late" alert.

| Token | Hex | Role |
|---|---|---|
| `--color-ink` | `#1B1D1F` | Primary text, headings |
| `--color-graphite` | `#6B7178` | Secondary/muted text |
| `--color-mist` | `#E7E9EC` | Borders, dividers, table lines |
| `--color-steel` | `#F6F7F8` | App background |
| `--color-surface` | `#FFFFFF` | Cards, panels, table rows |
| `--color-primary` | `#1F5C5B` | Primary buttons, active nav, links, brand mark |
| `--color-primary-hover` | `#184645` | Primary hover/pressed |
| `--color-success` | `#3E7A4C` | Ready / Paid / In stock / Delivered / Active subscription |
| `--color-warning` | `#D48A1E` | Pending / Low stock / Expiring soon / Awaiting payment |
| `--color-danger` | `#C1440E` | Cancelled / Out of stock / Expired / Overdue ticket |
| `--color-info` | `#4C6B8A` | Neutral informational states, new/unassigned |

**Do:** use `--color-primary` only for the one primary action on a screen (the button someone is most likely to press next).
**Don't:** use `--color-danger` decoratively — it must always mean "this needs attention now."

### 2.2 Typography

Two-family pairing, chosen for the subject, not the default:

- **UI/body face — Manrope.** A clean, slightly warm grotesque that stays legible at small sizes in dense tables — more distinctive than reaching for Inter again, but just as functional.
- **Numeric/ticket face — JetBrains Mono** (or IBM Plex Mono), used *only* for order numbers, table numbers, SKUs, and receipt totals. This is the product's signature detail: numbers that matter for money or a ticket render in a monospace face, evoking a thermal receipt printer / kitchen chit. It's a small thing that makes the product feel like it was built for a restaurant, not skinned onto a generic template.

| Style | Face | Size / Line height | Weight | Use |
|---|---|---|---|---|
| Display | Manrope | 32/40 | 700 | Dashboard page titles |
| H1 | Manrope | 24/32 | 700 | Section headers |
| H2 | Manrope | 18/26 | 600 | Card/panel titles |
| Body | Manrope | 14/20 | 400–500 | Default UI text |
| Small | Manrope | 12/16 | 500 | Table meta, timestamps, captions |
| Ticket/Numeric | JetBrains Mono | 14–20/1.3 | 500–700 | Order #, table #, prices, quantities, ledger figures |

Always set `font-variant-numeric: tabular-nums` on any column of numbers (prices, quantities, ledger balances) so digits align vertically — non-negotiable for anything resembling a financial table.

### 2.3 Spacing, radius, elevation

- **Spacing scale:** 4px base — `4, 8, 12, 16, 24, 32, 48, 64`. Table cell padding defaults to `8/12`; card padding defaults to `16/24`.
- **Radius scale:** `--radius-sm: 6px` (inputs, badges), `--radius-md: 10px` (cards, buttons), `--radius-lg: 16px` (modals, panels). No fully-rounded (pill) buttons except status badges and the POS cart's quantity steppers.
- **Elevation:** flat by default (`--color-mist` borders do the separating work). Reserve shadow for things that float above content — dropdowns, dialogs, the POS cart drawer. `--shadow-sm` for popovers, `--shadow-md` for modals.

### 2.4 Iconography

`lucide-react` throughout (already in your stack), 1.5px stroke, 16px in dense tables / 20px in nav and buttons. Icons never appear without a text label except in the mobile bottom nav and table row actions — this is an operational tool, not a place to make people guess what a glyph means.

---

## 3. Semantic status language (use identically everywhere)

This table is the contract between web, POS, KDS, and Flutter. Any screen showing status must pull from this exact set — no ad hoc colors or wording per screen.

**Order status**
| State | Color | Label |
|---|---|---|
| New | Info (slate blue) | "New" |
| Preparing | Warning (saffron) | "Preparing" |
| Ready | Success (herb) | "Ready" |
| Out for delivery | Info | "Out for delivery" |
| Completed | Graphite (neutral, done) | "Completed" |
| Cancelled | Danger (ember) | "Cancelled" |
| Overdue (past expected prep time) | Danger, with a subtle pulse | "Overdue" |

**Inventory status**
| State | Color | Label |
|---|---|---|
| In stock | Success | "In stock" |
| Low stock (below reorder level) | Warning | "Low stock" |
| Out of stock | Danger | "Out of stock" |

**Subscription status (Super Admin + Org Admin banner)**
| State | Color | Label |
|---|---|---|
| Active | Success | "Active" |
| Expiring soon (≤5 days) | Warning | "Expires in X days" |
| Expired | Danger | "Expired" |
| Trial | Info | "Trial" |

Render all of these as the same component: a small dot (or `Badge` in shadcn) + label, never color alone — color-blind staff must be able to read status from the label.

---

## 4. Layout patterns per surface

### 4.1 Owner / Org Admin dashboard (desk-first, dense)
```
┌─────────────┬──────────────────────────────────────────┐
│  Sidebar     │  Topbar: org name · subscription badge · user menu │
│  (nav, role- ├──────────────────────────────────────────┤
│  scoped)     │  Page header (title + primary action, right-aligned) │
│              │  Filters / date range                     │
│              │  Content: DataTable or KPI cards + chart   │
└─────────────┴──────────────────────────────────────────┘
```
- Sidebar sections mirror the modules from the build plan (Orders, Products, Inventory, Sales, Ledger, Clients, Employees, Tasks, Reports, Settings).
- Every list screen = `DataTable` (TanStack Table) with: search, status filter chips (using §3 colors), pagination, and row-click → detail `Sheet` (slide-over), not full navigation, for anything you want to glance at without losing table context.

### 4.2 Salesman / POS screen (counter-first, touch, fast)
```
┌───────────────────────┬───────────────┐
│  Product grid           │  Cart          │
│  (category tabs across   │  - line items │
│  top, large touch cards) │  - qty steppers│
│                          │  - totals      │
│                          │  [Charge] btn  │
└───────────────────────┴───────────────┘
```
- Product cards, not a table — large tap targets (min 64px), image + name + price, one tap adds to cart.
- Cart totals in the monospace ticket face (§2.2) — this is the screen where that detail matters most.
- `Command` component (shadcn) bound to a barcode scanner or quick keyboard search for fast product lookup without touching the grid.

### 4.3 Chef / Kitchen Display (KDS) — ticket rail, glance-from-a-distance
```
┌──────┬──────┬──────┬──────┬──────┐
│ #482 │ #483 │ #484 │ #485 │ #486 │   ← one column per ticket
│ T4   │ T7   │ Take │ Del  │ T2   │
│ New  │ Prep │ Prep │ Ready│ New  │
│ ...  │ ...  │ ...  │ ...  │ ...  │
│[Start]│[Done]│[Done]│[Fire]│[Start]│
└──────┴──────┴──────┴──────┴──────┘
```
- Runs in **Line Mode** (dark theme, §7) by default — kitchens are bright and glary, a dark UI with saturated status colors reads faster from three feet away than a white one.
- Order number and table number always in the monospace face, oversized (20–24px) — this is the one screen where legibility from a distance matters more than density.
- One primary tap target per ticket (advance status) — no nested menus, no hover states (there's no mouse in a kitchen).
- New tickets enter with a single short animation (slide + soft highlight for ~2s); nothing else on this screen animates.

### 4.4 Delivery boy — mobile-first, single task at a time
- One active delivery shown full-screen (address, phone-tap-to-call, "Mark delivered" as the only primary button); a collapsed list of queued deliveries below.
- Big bottom-anchored primary action (thumb reach), map/route link, offline indicator always visible (this is the role most likely to be out of signal).

### 4.5 Super Admin
- Same dashboard shell as §4.1, but the org list is the home screen: `DataTable` of organizations with subscription-status badge (§3), expiry date, and inline "Extend" action opening a small `Dialog` (pick duration or custom date) — this should be the fastest possible action in the whole product, since it's done manually and often.

---

## 5. Component conventions (shadcn/ui mapping)

| Need | Component | Note |
|---|---|---|
| Any list of records | `DataTable` (+ TanStack Table) | Server-side pagination/sort via TanStack Query |
| Quick view/edit without losing list context | `Sheet` | Preferred over full page nav for row detail |
| Destructive or state-changing confirmation | `Dialog` | Only for irreversible or costly actions (cancel order, delete product) — never for routine confirmations |
| Forms | `Form` + `react-hook-form` + `zod` | Same Zod schema as the API validates, imported from `shared-schemas` |
| Status | `Badge`, color from §3 | Dot + label, never color-only |
| Feedback after an action | `Toast` (`sonner`) | Same verb as the button: "Publish" → "Published" |
| Loading | `Skeleton` matching final layout shape | Never a generic spinner for table/list content |
| Fast search/command (POS, global search) | `Command` | |
| Empty states | Custom `EmptyState` (icon + one sentence + primary action) | See §6 |

---

## 6. States: empty, loading, error

Treat these as content, not afterthoughts — per-module, not generic.

- **Empty:** name what's missing and offer the next action. *"No orders yet today. Orders will show up here as they come in."* Not: "No data available."
- **Loading:** skeletons shaped like the real content (row-shaped skeletons for tables, card-shaped for the POS grid) so nothing visually jumps when data arrives.
- **Error:** say what happened and what to do, in the interface's voice, never apologetic or vague. *"Couldn't save this order — check your connection and try again."* Not: "Something went wrong."
- **Subscription expired:** a persistent, non-dismissible banner (warning/danger color from §3) on Org Admin, with the exact next step: *"Your subscription expired on [date]. Contact [support contact] to renew."* — never block silently.

---

## 7. Line Mode (dark theme for KDS)

A second theme, not just inverted colors — tuned specifically for a kitchen screen viewed from a distance in a bright, hot room.

| Token | Hex |
|---|---|
| `--color-ink` (bg) | `#14161A` |
| `--color-surface` (ticket card) | `#1E2125` |
| `--color-text` | `#ECEEF0` |
| `--color-mist` (dividers) | `#2C3036` |
| Status colors | Same hues as §2.1, luminance boosted ~10% for contrast against the dark background |

Line Mode is the default for the Chef KDS view only. It is **not** a general "dark mode toggle" for the rest of the product at launch — ship it as one deliberate, purpose-built surface rather than a half-supported theme everywhere.

---

## 8. Motion

Motion is used exactly three places, each with a job:
1. **New ticket arriving on KDS** — brief slide-in + highlight, so a busy chef notices without needing to stare at the screen.
2. **Status transitions** (badge color/label change) — a quick 150ms crossfade, confirms the tap registered.
3. **Toast in/out** — standard slide + fade, 200ms.

Everywhere else: no motion. Table rows don't animate in, cards don't hover-lift, nothing bounces. This is a tool people use hundreds of times a day — decorative motion becomes friction at that frequency. Always respect `prefers-reduced-motion`.

---

## 9. Accessibility & responsive rules

- Minimum tap target **44×44px** everywhere; **64px** on POS and KDS (thumbs, gloves, haste).
- Text contrast: body text ≥ 4.5:1 against its background in both Standard and Line Mode — check the boosted status colors in §7 against `#14161A`, not just against white.
- Every status must be readable from label text alone, never color alone (§3).
- Visible keyboard focus ring (`--color-primary`, 2px offset) on every interactive element — Owner/Admin desk users will tab through forms.
- Org Admin and Super Admin: responsive down to a narrow tablet (768px) — sidebar collapses to icons, `DataTable` columns priority-drop the least critical ones first (keep status, ID, total; drop "created by," "notes" on narrow screens).
- Flutter app: design for one-handed use, offline indicator always visible in the app bar (not just on a settings screen), sync-pending count shown as a small badge so staff trust the app is catching up.

---

## 10. Writing & microcopy voice

- **Active voice, plain verbs.** "Mark ready," not "Update status." The button's verb becomes the toast's verb: "Mark ready" → "Order #482 marked ready."
- **Name things the way restaurant staff do**, not the way the schema does: "Table 4," not "table_no: 4"; "Low stock," not "below_reorder_threshold."
- **Errors state fact + fix**, no apology, no blame: "Couldn't charge this order — the card was declined. Try another payment method."
- **Numbers are exact.** Never round or vague-ify money, quantities, or time-until-expiry in copy — this is a financial tool.
- **One term per concept, forever.** Pick "Order" (not "ticket" and "order" interchangeably in copy — "ticket" is fine as kitchen-floor slang inside the KDS visual language, but user-facing text stays "Order"). Pick "Client" or "Customer," not both. Decide once, grep the codebase before shipping copy that drifts.

---

## 11. Implementation: tokens in code

`packages/config/tailwind.config.ts` (shared base, extended per app):
```ts
export default {
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        graphite: "var(--color-graphite)",
        mist: "var(--color-mist)",
        steel: "var(--color-steel)",
        surface: "var(--color-surface)",
        primary: { DEFAULT: "var(--color-primary)", hover: "var(--color-primary-hover)" },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
    },
  },
};
```

`globals.css` (Standard theme; `.line-mode` class swaps the KDS surface to §7's values):
```css
:root {
  --color-ink: #1B1D1F;
  --color-graphite: #6B7178;
  --color-mist: #E7E9EC;
  --color-steel: #F6F7F8;
  --color-surface: #FFFFFF;
  --color-primary: #1F5C5B;
  --color-primary-hover: #184645;
  --color-success: #3E7A4C;
  --color-warning: #D48A1E;
  --color-danger: #C1440E;
  --color-info: #4C6B8A;
}

.line-mode {
  --color-ink: #14161A;
  --color-surface: #1E2125;
  --color-mist: #2C3036;
  /* status colors boosted per §7 */
}

.tabular-nums { font-variant-numeric: tabular-nums; }
```

---

## 12. Design QA checklist (run before shipping any screen)

- [ ] Does every status use the exact color + label from §3 — no one-off colors?
- [ ] Is the primary action the only thing using `--color-primary`?
- [ ] Do prices/quantities/order numbers use the monospace face with tabular figures?
- [ ] Does this screen work at 768px width and with a 44px+ (64px on POS/KDS) tap target?
- [ ] Does the empty state name what's missing and offer a next action?
- [ ] Does the error state say what happened and what to do?
- [ ] Does the toast verb match the button verb?
- [ ] Any motion added — does it serve one of the three jobs in §8, or should it be removed?
- [ ] Checked against `prefers-reduced-motion` and keyboard-only navigation?
