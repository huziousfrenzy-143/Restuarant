# Restaurant SaaS Multi-Tenant Platform

A high-performance operational SaaS platform for local restaurants built strictly according to `restaurant-saas-design-system.md` and `restaurant-saas-plan.md`.

## Workspace Overview

- **`apps/org-admin`**: Operational web application for restaurant staff (Owner Dashboard, POS Terminal, Kitchen Display System in **Line Mode** dark theme `#14161A`, Inventory & Recipe deductions, Orders Rail, General Ledger, Clients CRM, Tasks, Reports, Settings).
- **`apps/super-admin`**: Platform Super Admin manager for tenant organization registration, manual subscription extensions (1-month, 3-months, custom date), and platform audit logs.
- **`apps/api`**: Express REST API backend featuring schema-per-tenant isolation simulation, JWT authentication, Zod input validation, subscription enforcement middleware, rate limiting, and in-memory mock database store.
- **`packages/shared-schemas`**: Centralized Zod validation schemas and TypeScript types shared across API and web frontends.
- **`packages/ui`**: Design tokens (Stainless steel base `#F6F7F8`, petrol teal primary `#1F5C5B`, semantic status badges, JetBrains Mono font formatting, `tabular-nums` helpers).

---

## Quick Start Instructions

1. **Install dependencies across monorepo**:
   ```bash
   npm install
   ```

2. **Start Express Backend API** (runs on `http://localhost:4000`):
   ```bash
   npm run dev:api
   ```

3. **Start Org Admin & POS Web App** (runs on `http://localhost:3000`):
   ```bash
   npm run dev:org
   ```

4. **Start Platform Super Admin Panel** (runs on `http://localhost:3001`):
   ```bash
   npm run dev:super
   ```

---

## Design System Specifications Implemented

- **Color Tokens**: `--color-steel` (#F6F7F8), `--color-ink` (#1B1D1F), `--color-graphite` (#6B7178), `--color-mist` (#E7E9EC), `--color-surface` (#FFFFFF), `--color-primary` (#1F5C5B), `--color-success` (#3E7A4C), `--color-warning` (#D48A1E), `--color-danger` (#C1440E), `--color-info` (#4C6B8A).
- **Line Mode (Kitchen KDS Dark Theme)**: Dedicated `#14161A` surface with boosted contrast status colors for glare-lit kitchen environments.
- **Typography**: Manrope for UI controls, JetBrains Mono for prices, quantities, SKUs, and ticket numbers (`tabular-nums`).
- **Semantic Status Language**: Strict 1-to-1 badge color and wording alignment across all surfaces.
