-- ============================================================================
-- Restaurant SaaS — Multi-Tenant PostgreSQL Schema DDL Script
-- Architecture: Shared Database with Schema-Per-Tenant Isolation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PUBLIC SCHEMA (Platform Level)
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS public.organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    schema_name VARCHAR(128) NOT NULL UNIQUE,
    subscription_status VARCHAR(32) NOT NULL CHECK (subscription_status IN ('active', 'expiring_soon', 'expired', 'trial')),
    subscription_expires_at TIMESTAMPTZ NOT NULL,
    plan_type VARCHAR(32) NOT NULL DEFAULT 'pro',
    address TEXT,
    phone VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.super_admin_users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity VARCHAR(128) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- 2. TENANT SCHEMA TEMPLATE & SAMPLE ("tenant_saffron")
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS tenant_saffron;
SET search_path TO tenant_saffron, public;

-- Users (Staff)
CREATE TABLE IF NOT EXISTS tenant_saffron.users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(64),
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'admin', 'chef', 'salesman', 'delivery_boy')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product Categories
CREATE TABLE IF NOT EXISTS tenant_saffron.product_categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

-- Products
CREATE TABLE IF NOT EXISTS tenant_saffron.products (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL REFERENCES tenant_saffron.product_categories(id),
    category_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sku VARCHAR(64) NOT NULL UNIQUE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT
);

-- Raw Stock Inventory Items
CREATE TABLE IF NOT EXISTS tenant_saffron.inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(32) NOT NULL CHECK (unit IN ('kg', 'g', 'l', 'ml', 'pcs', 'box', 'portion')),
    current_qty NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    reorder_level NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock'))
);

-- Product Recipes (Links Menu Item to Raw Stock Items for Auto-Deduction)
CREATE TABLE IF NOT EXISTS tenant_saffron.product_recipes (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES tenant_saffron.products(id) ON DELETE CASCADE,
    inventory_item_id VARCHAR(64) NOT NULL REFERENCES tenant_saffron.inventory_items(id),
    qty_required NUMERIC(10, 3) NOT NULL
);

-- Inventory Movements Log
CREATE TABLE IF NOT EXISTS tenant_saffron.inventory_movements (
    id VARCHAR(64) PRIMARY KEY,
    item_id VARCHAR(64) NOT NULL REFERENCES tenant_saffron.inventory_items(id),
    item_name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('purchase', 'sale_deduction', 'wastage', 'adjustment')),
    qty NUMERIC(10, 3) NOT NULL,
    reference_id VARCHAR(128),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients / CRM Register
CREATE TABLE IF NOT EXISTS tenant_saffron.clients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    address TEXT,
    notes TEXT,
    credit_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- Orders
CREATE TABLE IF NOT EXISTS tenant_saffron.orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(64) NOT NULL UNIQUE, -- e.g. #482
    type VARCHAR(32) NOT NULL CHECK (type IN ('dine_in', 'takeaway', 'delivery')),
    status VARCHAR(32) NOT NULL CHECK (status IN ('new', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
    table_no VARCHAR(32),
    client_id VARCHAR(64) REFERENCES tenant_saffron.clients(id),
    client_name VARCHAR(255),
    delivery_boy_id VARCHAR(64),
    delivery_boy_name VARCHAR(255),
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    prep_time_mins INT NOT NULL DEFAULT 15,
    is_overdue BOOLEAN NOT NULL DEFAULT FALSE
);

-- Order Items
CREATE TABLE IF NOT EXISTS tenant_saffron.order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES tenant_saffron.orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES tenant_saffron.products(id),
    product_name VARCHAR(255) NOT NULL,
    qty INT NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    notes TEXT
);

-- Sales / Payment Receipts
CREATE TABLE IF NOT EXISTS tenant_saffron.sales (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES tenant_saffron.orders(id),
    order_number VARCHAR(64) NOT NULL,
    payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'client_credit')),
    amount_paid NUMERIC(10, 2) NOT NULL,
    amount_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cashier_id VARCHAR(64) NOT NULL,
    cashier_name VARCHAR(255) NOT NULL
);

-- General Ledger Accounts
CREATE TABLE IF NOT EXISTS tenant_saffron.ledger_accounts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('cash', 'bank', 'receivable', 'payable', 'revenue', 'expense')),
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- General Ledger Double-Entry Journal Postings
CREATE TABLE IF NOT EXISTS tenant_saffron.ledger_entries (
    id VARCHAR(64) PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL REFERENCES tenant_saffron.ledger_accounts(id),
    account_name VARCHAR(255) NOT NULL,
    debit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reference_type VARCHAR(64) NOT NULL,
    reference_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff Tasks
CREATE TABLE IF NOT EXISTS tenant_saffron.tasks (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to_id VARCHAR(64) NOT NULL,
    assigned_to_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('pending', 'in_progress', 'done')),
    due_at TIMESTAMPTZ NOT NULL,
    created_by VARCHAR(255) NOT NULL
);

-- Tenant Audit Log
CREATE TABLE IF NOT EXISTS tenant_saffron.audit_log (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity VARCHAR(128) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
