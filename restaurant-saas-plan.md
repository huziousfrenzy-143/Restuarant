# Restaurant Management SaaS — Architecture & Build Plan

## 0. The two decisions you left open

### Next.js vs Express+React
**Recommendation: both, decoupled.**
Use a **standalone Express (or Fastify) API** as the single source of truth, and **Next.js** for the two web frontends (Super Admin, Org Admin). Reasons:

- Your **Flutter app must talk to a REST/JSON API regardless** — it can't call Next.js server actions. So a backend API exists no matter what.
- If you put business logic in Next.js API routes *and* need it again for Flutter, you duplicate it. One Express/Fastify API serving all three clients (Super Admin web, Org Admin web, Flutter mobile) keeps auth, validation, RBAC, and business rules in exactly one place.
- Next.js on the frontend still gives you file-based routing, layouts, middleware (for route guards), and easy Vercel/self-hosted deployment — you just use it as a typed API consumer via TanStack Query, not as your backend.
- Fastify is worth considering over Express (faster, native TS support, schema validation built-in via JSON Schema/Zod adapters) — but since you already know Express + helmet + rate-limiting patterns, Express is a perfectly fine, boring, reliable choice. I'll spec both apps assuming **Express**, with a note where Fastify would differ.

### antd vs shadcn/ui
**Recommendation: shadcn/ui.**

| | antd | shadcn/ui |
|---|---|---|
| Speed for CRUD-heavy admin screens | Faster out of the box | Slower initially (you compose more) |
| Works with Tailwind | Fights it (own CSS-in-JS reset, needs `important` overrides) | Native — it *is* Tailwind + Radix |
| Customization / white-label per org later | Harder, theming API is limited | Full control, easy to re-skin per tenant |
| Bundle size | Heavy | Light (only what you copy in) |
| Data tables | Built-in `Table` | Pairs with TanStack Table (which you're already using TanStack for) |
| Ownership | External dependency | Code lives in your repo, you can patch anything |

Since you've already chosen Tailwind and TanStack, shadcn/ui + `@tanstack/react-table` is the coherent choice and avoids CSS conflicts. Use `shadcn`'s `DataTable`, `Form` (with `react-hook-form` + `zod`), `Dialog`, `Sheet`, `Command` (great for POS-style quick actions) as your core building blocks.

---

## 1. High-level architecture

```
                         ┌──────────────────────────┐
                         │ Postgres (schema/tenant)  │
                         │   + Redis (cache/RL)      │
                         └──────────┬────────────────┘
                                    │
                         ┌──────────▼────────────┐
                         │   Express API (core)   │
                         │  modular monolith      │
                         │  helmet, rate-limit,   │
                         │  zod, JWT, RBAC        │
                         └──┬───────┬───────┬─────┘
                            │       │       │
                ┌───────────▼┐ ┌────▼─────┐ ┌▼─────────────────┐
                │ Super Admin │ │ Org Admin│ │ Flutter POS App    │
                │ (Next.js)   │ │ (Next.js)│ │ offline-first,     │
                │ manages all │ │ per-tenant│ │ local SQLite,     │
                │ orgs + subs │ │ dashboard │ │ syncs when online │
                └─────────────┘ └───────────┘ └────────────────────┘
```

**Why a modular monolith and not microservices:** at your stage (local restaurants, one team), microservices add deployment/ops overhead with no real benefit. A well-modularized monolith (feature folders, clean boundaries) gives you 90% of the maintainability with 10% of the complexity. You can split out a service later (e.g. reporting) if it ever needs to scale independently.

---

## 2. Multi-tenancy strategy

**Recommendation: shared database, schema-per-tenant.** One Postgres instance, one database — but each organization gets its own native Postgres schema (namespace) holding its own copy of the tenant tables, rather than every org's rows sitting mixed together in shared tables.

Why not fully shared schema: relying purely on an `org_id` column + RLS means every single query, index, and backup strategy is only *one missed `WHERE` clause or misconfigured policy* away from leaking data across restaurants — and as the number of tables and developers grows, that risk compounds. It also means a noisy or heavily-used tenant can degrade query performance for everyone sharing the same tables/indexes. Schema-per-tenant makes cross-tenant access **structurally impossible** rather than policy-enforced: a connection scoped to `tenant_acme`'s schema simply cannot see `tenant_beta`'s tables, with or without a bug in application code.

Why not database-per-tenant (the other extreme): a fully separate database per restaurant is the strongest isolation but adds real ops overhead (connection pooling, migrations, monitoring, backups multiplied per tenant) that isn't justified at "local restaurants" scale. Schema-per-tenant is the middle ground: strong isolation, still one database to operate.

- **Shared `public` schema** holds only platform-level tables: `organizations` (the tenant registry), `subscriptions`, `super_admin_users`, and a platform-wide `audit_log` for cross-org actions.
- **Each org gets its own schema** (e.g. `tenant_<org_id>`), containing the full set of tenant tables from §5 (`users`, `products`, `inventory_items`, `orders`, `ledger_entries`, etc.) — no `org_id` column needed on these tables at all, since the schema boundary *is* the tenant boundary.
- **Provisioning:** creating a new organization runs a provisioning script that creates its schema and applies the full current migration set to it (see below).
- **Request routing:** `tenant.middleware.ts` resolves the org from the authenticated JWT, then runs `SET search_path TO tenant_<org_id>, public` on that request's DB connection/transaction — every subsequent query in the request automatically resolves against the right tenant's tables, with no per-query `org_id` filtering to remember or get wrong.
- **Migrations:** maintain one versioned migration set (via Drizzle) and run it against every tenant schema on deploy — a small migration-runner script loops over the schemas in `organizations` and applies pending migrations to each. At "local restaurants" scale (dozens to low thousands of tenants) this is fast; if you ever reach a tenant count where looped migrations become slow, that's the point to consider tiering your largest tenants onto dedicated databases — not a redesign, just moving a subset of schemas to another connection target.
- **Super Admin** connects with a role permitted to set `search_path` to any tenant schema, or to `public` for platform-wide queries — no bypass flags needed since isolation is structural, not policy-based.
- Optional extra layer: you can still add RLS *within* each tenant schema as a second line of defense against an application bug that sets the wrong `search_path` — cheap insurance, but the schema boundary is what's actually doing the isolation work here.

---

## 3. Monorepo structure

Use **pnpm workspaces + Turborepo** (fast incremental builds, shared packages, one repo for API + both Next.js apps; Flutter stays in its own folder but same repo for versioning convenience).

```
restaurant-saas/
├── apps/
│   ├── api/                     # Express backend (see §4)
│   ├── super-admin/             # Next.js — Anthropic-you, i.e. YOUR admin
│   ├── org-admin/               # Next.js — per-restaurant admin panel
│   └── mobile/                  # Flutter app (POS, offline-first)
├── packages/
│   ├── shared-schemas/          # Zod schemas — single source of truth for
│   │                             #   validation AND inferred TS types, used
│   │                             #   by both api/ and the Next.js apps
│   ├── api-client/               # Typed fetch wrapper + TanStack Query hooks
│   ├── ui/                       # Shared shadcn components, theme tokens
│   └── config/                   # eslint, tsconfig, tailwind base config
├── infra/
│   ├── docker-compose.yml        # postgres, redis, api, adminer (local dev)
│   ├── migrations/               # SQL migrations (if not using ORM migrate)
│   └── nginx/ (optional, if self-hosting)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

`shared-schemas` is the key piece that keeps Flutter, both Next.js apps, and the API from drifting out of sync — define a Zod schema once, generate the OpenAPI/JSON types from it, and Flutter's Dart models are generated from that same OpenAPI spec (via `openapi-generator` or hand-synced during Phase 6).

---

## 4. Backend (`apps/api`) structure — feature-modular

```
apps/api/src/
├── config/
│   ├── env.ts                  # zod-validated process.env
│   └── db.ts                   # pg pool / drizzle client
├── db/
│   ├── schema/                 # drizzle schema files, one per module
│   ├── migrations/
│   └── tenant-provisioning.ts   # create-schema + run-migrations-for-org logic
├── middlewares/
│   ├── auth.middleware.ts      # verifies JWT, attaches req.user
│   ├── tenant.middleware.ts    # resolves org, sets search_path to its schema
│   ├── subscription.middleware.ts  # blocks if org subscription expired
│   ├── rbac.middleware.ts      # role/permission guard
│   ├── rateLimiter.ts          # express-rate-limit + redis store
│   ├── helmet.ts
│   ├── errorHandler.ts
│   └── requestLogger.ts        # pino
├── modules/
│   ├── auth/
│   ├── organizations/          # org CRUD, subscription fields
│   ├── users/                  # staff: owner, chef, salesman, delivery boy
│   ├── products/                # menu items, categories, recipes
│   ├── inventory/                # stock items, movements, purchases, wastage
│   ├── orders/                   # dine-in / takeaway / delivery, order lifecycle
│   ├── sales/                    # POS transactions, payments, discounts, tax
│   ├── ledger/                    # accounts, journal entries, customer credit
│   ├── clients/                   # customer register / CRM
│   ├── tasks/                     # task assignment & tracking
│   ├── reports/                   # aggregation/reporting endpoints
│   ├── subscriptions/             # manual activation/renewal (super admin only)
│   └── sync/                      # Flutter offline sync endpoints
│       (each module: controller.ts, service.ts, repository.ts,
│        routes.ts, schema.ts [zod], types.ts)
├── jobs/
│   └── subscription-expiry.cron.ts
├── utils/
├── app.ts                       # express app, middleware wiring
└── server.ts                    # entrypoint
```

Each module follows **controller → service → repository**:
- `routes.ts` — Express router, wires `zod` validation middleware per route
- `controller.ts` — parses request, calls service, shapes response
- `service.ts` — business logic
- `repository.ts` — Drizzle queries only, no business logic
- `schema.ts` — Zod input/output schemas (imported from `packages/shared-schemas` where shared with frontend)

**ORM: Drizzle over Prisma.** Reasoning specific to your needs: Drizzle gives you raw SQL escape hatches needed for per-request `search_path` switching and looped per-schema migrations, has a lighter runtime, and its migration story works well with a strict-TS, Postgres-only setup. Prisma is fine too if your team is more comfortable with it — the schema-switching pattern above still works with Prisma via `$executeRaw` for `SET search_path`, though looping its migration runner across many tenant schemas takes more custom scripting than Drizzle's.

---

## 5. Core database schema (key tables)

Per §2, tables split across the shared `public` schema and each tenant's own schema — note the tenant tables below **no longer need an `org_id` column**, since the schema they live in already scopes them to one organization.

```
-- public schema (shared, platform-level) -----------------------------------

organizations         (id, name, slug, schema_name, subscription_status,
                       subscription_expires_at, plan_type, address, phone,
                       created_at, is_active)

super_admin_users      (id, name, email, password_hash, created_at)

platform_audit_log      (id, org_id, actor_id, action, entity, entity_id,
                         metadata, created_at)   -- cross-org actions: subscription
                                                   changes, org provisioning, etc.

-- tenant_<org_id> schema (one instance per organization) --------------------

users                 (id, name, email, phone, password_hash, role,
                       is_active, created_at)
                       role ENUM: owner, admin, chef, salesman, delivery_boy

roles_permissions     (role, permission_key)   -- fine-grained RBAC matrix

product_categories    (id, name)
products              (id, category_id, name, price, cost_price, sku,
                       is_available, image_url)
product_recipes       (id, product_id, inventory_item_id, qty_required)  -- links
                       menu items to raw stock for auto-deduction on sale

inventory_items        (id, name, unit, current_qty, reorder_level)
inventory_movements     (id, item_id, type[purchase|sale_deduction|
                        wastage|adjustment], qty, reference_id, created_by, created_at)
suppliers               (id, name, contact)
purchase_orders         (id, supplier_id, status, total, created_at)

clients                 (id, name, phone, address, notes, credit_balance)

orders                  (id, client_id, type[dine_in|takeaway|delivery],
                         status, table_no, delivery_boy_id, subtotal, tax,
                         discount, total, created_by, created_at)
order_items              (id, order_id, product_id, qty, unit_price, notes)

sales                    (id, order_id, payment_method, amount_paid,
                         amount_due, paid_at, cashier_id)

ledger_accounts           (id, name, type[cash|bank|receivable|payable])
ledger_entries              (id, account_id, debit, credit, reference_type,
                            reference_id, description, created_at)

employees_shifts          (id, user_id, clock_in, clock_out)
tasks                      (id, title, description, assigned_to,
                            status[pending|in_progress|done], due_at, created_by)

sync_log                  (id, device_id, entity, entity_id, op,
                           payload, client_ts, server_ts, applied)

audit_log                 (id, user_id, action, entity, entity_id,
                           metadata, created_at)
```

`organizations.schema_name` is what `tenant.middleware.ts` looks up to build the `search_path` for a request. `platform_audit_log` (public) captures cross-tenant/administrative actions like subscription changes; the per-tenant `audit_log` captures in-restaurant activity. `sync_log` is critical given offline sync — you'll want a clear trail of what each device pushed and when.

---

## 6. Auth & RBAC

- **JWT access token (short-lived, ~15 min) + refresh token (httpOnly cookie, rotated).**
- Access token payload: `{ user_id, org_id, role, permissions[] }`.
- `tenant.middleware.ts` reads `org_id` from the token (not from a request param — never trust client-supplied org_id), looks up its `schema_name`, and runs `SET search_path TO tenant_<org_id>, public` on that request's DB connection/transaction.
- **Roles:** `super_admin` (platform-level, lives in `public.super_admin_users`), `owner`, `admin` (org-level), `chef`, `salesman`, `delivery_boy`.
- Keep a `roles_permissions` table rather than hardcoding role checks everywhere — lets you adjust what a "salesman" can/can't do without redeploying, and makes a future custom-roles feature easy.
- Example permission keys: `orders.create`, `orders.updateStatus`, `inventory.adjust`, `ledger.view`, `reports.view`, `employees.manage`, `subscription.manage` (super admin only).
- Passwords: `argon2id` (preferred over bcrypt for new projects — resistant to GPU cracking).

---

## 7. Manual subscription management (no payment integration)

Simple and deliberate, since you're doing this by hand for now:

- `organizations.subscription_status`: `trial | active | expired | suspended`
- `organizations.subscription_expires_at`: date
- Super Admin panel has one screen: list of orgs, current status, expiry date, and an **"Extend by 1 month" / "Set custom date" / "Suspend"** action — writes to `subscription_expires_at` and logs to `audit_log`.
- `subscription.middleware.ts` runs on every Org Admin / Flutter API request (except auth/read-only "renew reminder" endpoints): if `subscription_expires_at < now()`, block writes and return a `402`-style payload the frontend renders as "Subscription expired — contact support."
- A daily cron (`subscription-expiry.cron.ts`) flips `active → expired` automatically at midnight and can optionally trigger an email/WhatsApp reminder a few days before expiry (easy to bolt on later even without payment integration).
- Design the field now so adding real payment gateways later (Stripe/local gateway) is just: gateway webhook → same "extend subscription_expires_at" function you already wrote for manual use.

---

## 8. Frontend architecture (Next.js apps)

**State management split (this matters — don't blur it):**
- **TanStack Query** = all server state: products, orders, inventory, everything that comes from the API. Handles caching, refetching, optimistic updates (e.g. instantly show a new order while it POSTs).
- **Zustand** = client-only UI state: current POS cart before submit, active table selection, sidebar collapsed/expanded, multi-step form wizard state, currently selected date-range filter. If it's fetched from the server, it doesn't belong in Zustand.

**Folder structure per Next.js app (App Router):**
```
apps/org-admin/src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── orders/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── ledger/
│   │   ├── clients/
│   │   ├── employees/
│   │   ├── tasks/
│   │   ├── reports/
│   │   └── settings/
│   └── layout.tsx
├── components/           # feature components
├── components/ui/         # shadcn primitives
├── hooks/                  # useOrders(), useInventory() → TanStack Query hooks
├── stores/                  # zustand stores (posCartStore, uiStore)
├── lib/                      # api-client instance, utils, zod re-exports
└── middleware.ts             # route guard, redirects unauth'd users
```
`apps/super-admin` mirrors this but with modules: `organizations/`, `subscriptions/`, `platform-analytics/`, `audit-logs/`.

---

## 9. Flutter app — offline-first with sync

This is the most architecturally distinct piece, so treat it as its own mini-project:

- **Local storage:** `drift` (SQLite wrapper with type-safe queries, closest DX to your Drizzle backend) mirroring the subset of schema the mobile app needs (products, inventory snapshot, orders, clients, tasks).
- **Outbox pattern for writes:** every local create/update/delete is (a) applied immediately to local SQLite for instant UI response, and (b) appended to a local `pending_changes` table (`entity`, `entity_id`, `op`, `payload`, `client_ts`, `synced=false`).
- **Sync engine:**
  - `POST /sync/push` — batches unsynced local changes up when connectivity returns.
  - `GET /sync/pull?since=<cursor>` — server returns all changes for that org since the device's last sync cursor.
  - Store a per-device `sync_cursor` (server timestamp or monotonic counter) so pulls are incremental, not full-table.
- **Conflict resolution:**
  - Default: **last-write-wins** using server timestamp, fine for most fields (product name, table status, task status).
  - For anything financial/quantity-based (inventory stock, ledger balances) — never let two devices "overwrite" a number. Instead store **deltas/movements**, not absolute values (`inventory_movements`, not `inventory_items.current_qty` directly edited from two places) and recompute the current quantity server-side from the movement log. This sidesteps most conflict problems entirely for the data that actually matters.
- **Connectivity handling:** `connectivity_plus` package to detect online/offline; background sync via `workmanager` when connectivity returns; visible "syncing… / X changes pending" indicator so staff trust the app.
- **Auth offline:** cache the JWT and a short-lived "offline session" so staff can keep working through a connectivity drop without being logged out; re-validate token on next successful sync.

---

## 10. API design conventions

- REST, versioned: `/api/v1/...`
- Consistent envelope: `{ data, meta }` for success, `{ error: { code, message, details } }` for failures.
- Pagination: cursor-based for sync/reports, offset-based (`page`, `limit`) fine for admin tables.
- Every mutating endpoint validated with a Zod schema from `shared-schemas` — reject before it touches a service.
- Idempotency keys on POS/order-creation endpoints (important once Flutter can retry a push after a flaky connection) — client sends a UUID, server dedupes.

---

## 11. Security checklist

- `helmet()` with a tightened CSP for the two Next.js apps (no inline scripts by default).
- `express-rate-limit` backed by Redis store, tiered: strict on `/auth/login` (brute-force protection), looser on general API.
- CORS: explicit allow-list of your two frontend origins, credentials: true for cookie-based refresh tokens.
- Zod validation on every input, including query params — don't just validate body.
- Schema-per-tenant isolation (§2) as the tenant-isolation backstop — this is the single highest-leverage security decision in this whole system for a multi-tenant SaaS, since it makes cross-tenant access structurally impossible rather than dependent on every query remembering a filter.
- `argon2id` password hashing, refresh-token rotation, revoke-on-logout token blacklist (Redis, short TTL matching refresh expiry).
- `audit_log` on all sensitive actions: subscription changes, role changes, deletions, ledger adjustments.
- Strict TS everywhere (`strict: true`, `noUncheckedIndexedAccess: true`) — catches a large class of bugs before they become security or data-integrity issues, especially valuable given the offline-sync surface area.
- Secrets via environment variables validated at boot with a Zod-checked `env.ts` (fail fast if misconfigured, not at 2am in production).

---

## 12. Suggested build order (phased)

| Phase | Scope |
|---|---|
| **0 — Foundations** | Monorepo setup, Postgres + Drizzle + schema-per-tenant provisioning scaffolding, auth module (JWT, RBAC), CI, Docker Compose for local dev |
| **1 — Org core** | Organizations, users/employees, products, product categories |
| **2 — Inventory** | Inventory items, movements, purchase orders, low-stock alerts, recipe-linking to products |
| **3 — Orders & Sales** | Order lifecycle (dine-in/takeaway/delivery), order items, POS sales flow, payments, kitchen-facing order status view |
| **4 — Ledger & Clients** | Ledger accounts/entries tied to sales & purchases, client register with credit balances |
| **5 — Tasks & Reports** | Task assignment/tracking, sales/inventory/employee reports & dashboards |
| **6 — Super Admin** | Org management, manual subscription activation/renewal, platform-wide analytics, audit log viewer |
| **7 — Flutter app** | Local schema (drift), core POS flows offline, outbox + sync engine, conflict-safe inventory movements |
| **8 — Hardening** | Rate limiting tuning, security review, load-test the reporting queries, backup/restore drill for Postgres, staging → prod rollout |

Each phase is independently demoable — you can start onboarding a pilot restaurant after Phase 3–4 even before Flutter exists, using the Org Admin web app as the interim POS.

---

## 13. Deployment notes

- **Postgres:** managed (Supabase, Neon, or RDS) — get automated backups and point-in-time recovery from day one; don't self-host Postgres for a product handling restaurant financial data unless you have strong ops reasons to.
- **Redis:** for rate-limit store + refresh-token blacklist + optional caching of report queries.
- **API + Next.js apps:** containerize (Docker) for consistency; API can run on Railway/Render/Fly.io/EC2, Next.js apps deploy well on Vercel or the same container host.
- **Flutter:** standard app store / Play Store distribution; consider a lightweight OTA update mechanism (e.g. Shorebird) for fast bug fixes given the offline-first complexity.

---

If you'd like, I can go deeper on any one piece next — e.g. the actual Drizzle schema + RLS SQL, the RBAC permission matrix, or the Flutter sync engine in more implementation detail.
