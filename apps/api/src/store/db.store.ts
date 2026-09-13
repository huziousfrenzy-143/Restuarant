import { pgPool } from '../db/pg.client';
import { hashPassword } from '../utils/password';
import {
  Organization,
  User,
  ProductCategory,
  Product,
  InventoryItem,
  InventoryMovement,
  Client,
  Order,
  Sale,
  LedgerAccount,
  LedgerEntry,
  Task,
  AuditLog,
  PaymentMethod
} from '@restaurant-saas/shared-schemas';

export interface TenantProduct extends Product {
  org_id: string;
}

export interface TenantInventoryItem extends InventoryItem {
  org_id: string;
}

export interface TenantCategory extends ProductCategory {
  org_id: string;
}

export interface TenantClient extends Client {
  org_id: string;
}

export interface TenantUser extends User {
  org_id: string;
  password?: string;
}

export interface TenantOrder extends Order {
  org_id: string;
}

export interface TenantSale extends Sale {
  org_id: string;
}

export interface TenantTask extends Task {
  org_id: string;
}

export interface TenantPaymentMethod extends PaymentMethod {
  org_id: string;
}

export interface TenantLedgerAccount extends LedgerAccount {
  org_id: string;
}

export interface TenantLedgerEntry extends LedgerEntry {
  org_id: string;
}

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  password?: string;
  created_at: string;
}

export class DbStore {
  organizations: Organization[] = [];
  users: TenantUser[] = [];
  superAdminUsers: SuperAdminUser[] = [];
  categories: TenantCategory[] = [];
  products: TenantProduct[] = [];
  inventoryItems: TenantInventoryItem[] = [];
  inventoryMovements: InventoryMovement[] = [];
  clients: TenantClient[] = [];
  orders: TenantOrder[] = [];
  paymentMethods: TenantPaymentMethod[] = [];
  sales: TenantSale[] = [];
  ledgerAccounts: TenantLedgerAccount[] = [];
  ledgerEntries: TenantLedgerEntry[] = [];
  tasks: TenantTask[] = [];
  auditLogs: AuditLog[] = [];

  private isLoaded = false;

  constructor() {
    this.initDefaultState();
  }

  public initDefaultState() {
    const defaultPasswordHash = hashPassword('password123');

    this.superAdminUsers = [
      { id: 'usr-super-admin', name: 'Super Admin Operator', email: 'arhamsaifofficial@gmail.com', password_hash: defaultPasswordHash, created_at: '2026-01-01T00:00:00Z' }
    ];

    this.organizations = [
      {
        id: 'org-1',
        name: 'Saffron Grill & Tandoor',
        slug: 'saffron-grill',
        schema_name: 'tenant_saffron',
        subscription_status: 'active',
        subscription_expires_at: new Date(Date.now() + 45 * 86400000).toISOString(),
        plan_type: 'pro',
        tax_rate: 10,
        address: '742 Evergreen Terrace, Downtown',
        phone: '+1 (555) 234-5678',
        created_at: '2026-01-15T08:00:00Z',
        is_active: true
      },
      {
        id: 'org-2',
        name: 'Green Basil Italian Bistro',
        slug: 'green-basil',
        schema_name: 'tenant_green_basil',
        subscription_status: 'expiring_soon',
        subscription_expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        plan_type: 'basic',
        tax_rate: 10,
        address: '108 Ocean Drive, Bay District',
        phone: '+1 (555) 876-5432',
        created_at: '2026-02-01T10:30:00Z',
        is_active: true
      },
      {
        id: 'org-3',
        name: 'Urban Burger Lab',
        slug: 'urban-burger',
        schema_name: 'tenant_urban_burger',
        subscription_status: 'expired',
        subscription_expires_at: '2026-07-15T00:00:00Z',
        plan_type: 'pro',
        tax_rate: 10,
        address: '45 Tech Avenue, West End',
        phone: '+1 (555) 345-6789',
        created_at: '2026-03-10T14:15:00Z',
        is_active: true
      }
    ];

    this.users = [
      { id: 'usr-owner-1', org_id: 'org-1', name: 'Elena Rostova', email: 'owner@saffrongrill.com', password: defaultPasswordHash, phone: '+1 555-0101', role: 'owner', is_active: true, created_at: '2026-01-15T08:00:00Z' },
      { id: 'usr-chef-1', org_id: 'org-1', name: 'Chef Marco Rossi', email: 'chef@saffrongrill.com', password: defaultPasswordHash, phone: '+1 555-0102', role: 'chef', is_active: true, created_at: '2026-01-16T09:00:00Z' },
      { id: 'usr-sales-1', org_id: 'org-1', name: 'Priya Sharma', email: 'pos@saffrongrill.com', password: defaultPasswordHash, phone: '+1 555-0103', role: 'salesman', is_active: true, created_at: '2026-01-16T10:00:00Z' },
      { id: 'usr-delivery-1', org_id: 'org-1', name: 'Alex Rivera', email: 'delivery@saffrongrill.com', password: defaultPasswordHash, phone: '+1 555-0104', role: 'delivery_boy', is_active: true, created_at: '2026-01-17T11:00:00Z' },
      { id: 'usr-owner-2', org_id: 'org-2', name: 'Giovanni Bellini', email: 'owner@greenbasil.com', password: defaultPasswordHash, phone: '+1 555-0201', role: 'owner', is_active: true, created_at: '2026-02-01T10:30:00Z' },
      { id: 'usr-chef-2', org_id: 'org-2', name: 'Chef Luigi Fontana', email: 'chef@greenbasil.com', password: defaultPasswordHash, phone: '+1 555-0202', role: 'chef', is_active: true, created_at: '2026-02-02T09:00:00Z' },
      { id: 'usr-sales-2', org_id: 'org-2', name: 'Matteo Ricci', email: 'pos@greenbasil.com', password: defaultPasswordHash, phone: '+1 555-0203', role: 'salesman', is_active: true, created_at: '2026-02-02T10:00:00Z' },
      { id: 'usr-owner-3', org_id: 'org-3', name: 'Marcus Vance', email: 'owner@urbanburger.com', password: defaultPasswordHash, phone: '+1 555-0301', role: 'owner', is_active: true, created_at: '2026-03-10T12:00:00Z' }
    ];

    this.categories = [
      { id: 'cat-101', org_id: 'org-1', name: 'Starters & Appetizers', sort_order: 1 },
      { id: 'cat-102', org_id: 'org-1', name: 'Main Courses', sort_order: 2 },
      { id: 'cat-103', org_id: 'org-1', name: 'Wood-fired Pizza', sort_order: 3 },
      { id: 'cat-104', org_id: 'org-1', name: 'Beverages & Mocktails', sort_order: 4 },
      { id: 'cat-201', org_id: 'org-2', name: 'Antipasti', sort_order: 1 },
      { id: 'cat-202', org_id: 'org-2', name: 'Handmade Pasta & Risotto', sort_order: 2 },
      { id: 'cat-203', org_id: 'org-2', name: 'Dolci & Italian Wines', sort_order: 3 },
      { id: 'cat-301', org_id: 'org-3', name: 'Smash Burgers', sort_order: 1 },
      { id: 'cat-302', org_id: 'org-3', name: 'Craft Sides & Fries', sort_order: 2 }
    ];

    this.products = [
      { id: 'prod-101', org_id: 'org-1', category_id: 'cat-101', category_name: 'Starters & Appetizers', name: 'Crispy Garlic Butter Wings', price: 12.50, cost_price: 4.20, sku: 'APP-WNG-01', is_available: true, recipe: [{ inventory_item_id: 'inv-101', inventory_item_name: 'Fresh Chicken Wings', qty_required: 0.35, unit: 'kg' }], variants: [] },
      { id: 'prod-102', org_id: 'org-1', category_id: 'cat-101', category_name: 'Starters & Appetizers', name: 'Truffle Parmesan Fries', price: 9.00, cost_price: 2.10, sku: 'APP-FRS-02', is_available: true, recipe: [{ inventory_item_id: 'inv-102', inventory_item_name: 'Idaho Potatoes', qty_required: 0.25, unit: 'kg' }], variants: [] },
      { id: 'prod-103', org_id: 'org-1', category_id: 'cat-102', category_name: 'Main Courses', name: 'Slow-Cooked Butter Chicken', price: 18.99, cost_price: 6.50, sku: 'MAIN-BCH-01', is_available: true, recipe: [{ inventory_item_id: 'inv-101', inventory_item_name: 'Fresh Chicken Wings', qty_required: 0.30, unit: 'kg' }], variants: [] },
      { id: 'prod-104', org_id: 'org-1', category_id: 'cat-103', category_name: 'Wood-fired Pizza', name: 'Artisanal Margherita Supreme', price: 16.00, cost_price: 3.90, sku: 'PIZ-MAR-01', is_available: true, recipe: [], variants: [] },
      { id: 'prod-201', org_id: 'org-2', category_id: 'cat-201', category_name: 'Antipasti', name: 'Bruschetta al Pomodoro & Basilico', price: 11.50, cost_price: 3.10, sku: 'GB-ANT-01', is_available: true, recipe: [{ inventory_item_id: 'inv-201', inventory_item_name: 'San Marzano Tomatoes', qty_required: 0.20, unit: 'kg' }], variants: [] },
      { id: 'prod-202', org_id: 'org-2', category_id: 'cat-202', category_name: 'Handmade Pasta & Risotto', name: 'Handmade Truffle Potato Gnocchi', price: 22.00, cost_price: 7.40, sku: 'GB-PST-02', is_available: true, recipe: [{ inventory_item_id: 'inv-202', inventory_item_name: 'Black Truffle Butter', qty_required: 0.05, unit: 'kg' }], variants: [] },
      { id: 'prod-203', org_id: 'org-2', category_id: 'cat-202', category_name: 'Handmade Pasta & Risotto', name: 'Penne alla Basilico Pesto', price: 19.50, cost_price: 5.80, sku: 'GB-PST-03', is_available: true, recipe: [], variants: [] },
      { id: 'prod-301', org_id: 'org-3', category_id: 'cat-301', category_name: 'Smash Burgers', name: 'Double Black Angus Smash Burger', price: 15.99, cost_price: 5.20, sku: 'UBL-BRG-01', is_available: true, recipe: [{ inventory_item_id: 'inv-301', inventory_item_name: 'Angus Beef Patties', qty_required: 0.30, unit: 'kg' }], variants: [] },
      { id: 'prod-302', org_id: 'org-3', category_id: 'cat-302', category_name: 'Craft Sides & Fries', name: 'Loaded Beer-Battered Onion Rings', price: 8.50, cost_price: 2.00, sku: 'UBL-SDE-02', is_available: true, recipe: [], variants: [] }
    ];

    this.inventoryItems = [
      { id: 'inv-101', org_id: 'org-1', name: 'Fresh Chicken Wings', unit: 'kg', current_qty: 24.5, reorder_level: 10.0, unit_cost: 4.50, status: 'in_stock' },
      { id: 'inv-102', org_id: 'org-1', name: 'Idaho Potatoes', unit: 'kg', current_qty: 48.0, reorder_level: 15.0, unit_cost: 1.20, status: 'in_stock' },
      { id: 'inv-201', org_id: 'org-2', name: 'San Marzano Tomatoes', unit: 'kg', current_qty: 18.0, reorder_level: 5.0, unit_cost: 3.20, status: 'in_stock' },
      { id: 'inv-202', org_id: 'org-2', name: 'Black Truffle Butter', unit: 'kg', current_qty: 1.5, reorder_level: 2.0, unit_cost: 45.00, status: 'low_stock' },
      { id: 'inv-301', org_id: 'org-3', name: 'Angus Beef Patties', unit: 'kg', current_qty: 35.0, reorder_level: 12.0, unit_cost: 8.50, status: 'in_stock' }
    ];

    this.clients = [
      { id: 'cli-101', org_id: 'org-1', name: 'David Miller', phone: '+1 555-4321', address: 'Apartment 4B, Central Park', notes: 'VIP Customer', credit_balance: 0 },
      { id: 'cli-201', org_id: 'org-2', name: 'Sophia Loren', phone: '+1 555-9988', address: 'Via Roma 12', notes: 'Prefers outdoor patio table', credit_balance: 50.00 }
    ];

    this.orders = [
      {
        id: 'ord-482',
        org_id: 'org-1',
        order_number: '#482',
        type: 'dine_in',
        status: 'preparing',
        table_no: 'T4',
        client_name: 'David Miller',
        items: [{ id: 'oi-1', product_id: 'prod-101', product_name: 'Crispy Garlic Butter Wings', qty: 2, unit_price: 12.50 }],
        subtotal: 25.00,
        tax: 2.50,
        discount: 0,
        total: 27.50,
        created_by: 'Priya Sharma',
        created_at: new Date(Date.now() - 15 * 60000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60000).toISOString(),
        prep_time_mins: 15,
        is_overdue: true
      }
    ];

    this.paymentMethods = [
      { id: 'pm-101', org_id: 'org-1', name: 'Cash Register', code: 'cash', linked_account_id: 'leg-org-1-1', linked_account_name: 'Cash Register Float', is_active: true },
      { id: 'pm-102', org_id: 'org-1', name: 'Card Terminal (Visa/Mastercard)', code: 'card', linked_account_id: 'leg-org-1-2', linked_account_name: 'Merchant Bank Account', is_active: true },
      { id: 'pm-103', org_id: 'org-1', name: 'UPI / QR Mobile Pay', code: 'upi', linked_account_id: 'leg-org-1-2', linked_account_name: 'Merchant Bank Account', is_active: true },
      { id: 'pm-104', org_id: 'org-1', name: 'Customer Store Credit', code: 'credit', linked_account_id: 'leg-org-1-3', linked_account_name: 'Customer Accounts Receivable', is_active: true }
    ];

    this.ledgerAccounts = [
      { id: 'leg-org-1-1', org_id: 'org-1', name: 'Cash Register Float', type: 'cash', balance: 1250.00 },
      { id: 'leg-org-1-2', org_id: 'org-1', name: 'Merchant Bank Account', type: 'bank', balance: 14850.50 },
      { id: 'leg-org-1-3', org_id: 'org-1', name: 'Customer Accounts Receivable', type: 'receivable', balance: 145.00 },
      { id: 'leg-org-1-4', org_id: 'org-1', name: 'Supplier Accounts Payable', type: 'payable', balance: 820.00 },
      { id: 'leg-org-1-5', org_id: 'org-1', name: 'Food & Beverage Revenue', type: 'revenue', balance: 42150.00 },
      { id: 'leg-org-1-6', org_id: 'org-1', name: 'Cost of Ingredients & Supplies', type: 'expense', balance: 12400.00 }
    ];

    this.tasks = [
      { id: 'tsk-101', org_id: 'org-1', title: 'Deep clean wood-fired pizza oven', description: 'Scrape ash, inspect stone deck, sanitize surroundings before evening shift', assigned_to_id: 'usr-chef-1', assigned_to_name: 'Chef Marco Rossi', status: 'in_progress', due_at: new Date(Date.now() + 4 * 3600000).toISOString(), created_by: 'Elena Rostova' }
    ];
  }

  // Lazy on-demand loader (prevents boot time performance overhead)
  async ensureLoaded() {
    if (this.isLoaded) return;
    await this.loadFromDb();
    this.isLoaded = true;
  }

  // Hydrate store on demand directly from PostgreSQL database relational tables using DATABASE_URL
  async loadFromDb() {
    try {
      const client = await pgPool.connect();

      // 1. Super Admin Users
      try {
        const saRes = await client.query(`SELECT id, name, email, COALESCE(password_hash, password) as password_hash, created_at FROM public.super_admin_users`);
        if (saRes.rows.length > 0) {
          this.superAdminUsers = saRes.rows;
        }
      } catch (e) {}

      // 2. Organizations
      try {
        const orgRes = await client.query(`SELECT id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, address, phone, created_at, is_active FROM public.organizations`);
        if (orgRes.rows.length > 0) {
          this.organizations = orgRes.rows;
        }
      } catch (e) {}

      // 3. Staff Users
      try {
        const userRes = await client.query(`SELECT id, org_id, name, email, password, phone, role, is_active, created_at FROM public.users`);
        if (userRes.rows.length > 0) {
          this.users = userRes.rows;
        }
      } catch (e) {}

      // 4. Categories
      try {
        const catRes = await client.query(`SELECT id, org_id, name, sort_order FROM public.categories`);
        if (catRes.rows.length > 0) {
          this.categories = catRes.rows;
        }
      } catch (e) {}

      // 5. Products
      try {
        const prodRes = await client.query(`SELECT id, org_id, category_id, category_name, name, price, cost_price, sku, is_available, recipe FROM public.products`);
        if (prodRes.rows.length > 0) {
          this.products = prodRes.rows;
        }
      } catch (e) {}

      // 6. Inventory Items
      try {
        const invRes = await client.query(`SELECT id, org_id, name, unit, current_qty, reorder_level, unit_cost, status FROM public.inventory_items`);
        if (invRes.rows.length > 0) {
          this.inventoryItems = invRes.rows;
        }
      } catch (e) {}

      // 7. Inventory Movements
      try {
        const movRes = await client.query(`SELECT id, item_id, item_name, type, qty, reference_id, created_by, created_at FROM public.inventory_movements`);
        if (movRes.rows.length > 0) {
          this.inventoryMovements = movRes.rows;
        }
      } catch (e) {}

      // 8. Clients
      try {
        const cliRes = await client.query(`SELECT id, org_id, name, phone, address, notes, credit_balance FROM public.clients`);
        if (cliRes.rows.length > 0) {
          this.clients = cliRes.rows;
        }
      } catch (e) {}

      // 9. Orders
      try {
        const ordRes = await client.query(`SELECT id, org_id, order_number, type, status, table_no, client_id, client_name, items, subtotal, tax, discount, total, created_by, created_at, updated_at, prep_time_mins, is_overdue FROM public.orders`);
        if (ordRes.rows.length > 0) {
          this.orders = ordRes.rows;
        }
      } catch (e) {}

      // 10. Sales
      try {
        const salesRes = await client.query(`SELECT id, org_id, order_id, order_number, payment_method, payment_method_name, amount_paid, amount_due, paid_at, cashier_id, cashier_name FROM public.sales`);
        if (salesRes.rows.length > 0) {
          this.sales = salesRes.rows;
        }
      } catch (e) {}

      // 11. Payment Methods
      try {
        const pmRes = await client.query(`SELECT id, org_id, name, code, linked_account_id, linked_account_name, is_active FROM public.payment_methods`);
        if (pmRes.rows.length > 0) {
          this.paymentMethods = pmRes.rows;
        }
      } catch (e) {}

      // 12. Ledger Accounts
      try {
        const accRes = await client.query(`SELECT id, org_id, name, type, balance FROM public.ledger_accounts`);
        if (accRes.rows.length > 0) {
          this.ledgerAccounts = accRes.rows;
        }
      } catch (e) {}

      // 13. Ledger Entries
      try {
        const entRes = await client.query(`SELECT id, org_id, account_id, account_name, debit, credit, reference_type, reference_id, description, created_at FROM public.ledger_entries`);
        if (entRes.rows.length > 0) {
          this.ledgerEntries = entRes.rows;
        }
      } catch (e) {}

      // 14. Tasks
      try {
        const tskRes = await client.query(`SELECT id, org_id, title, description, assigned_to_id, assigned_to_name, status, due_at, created_by FROM public.tasks`);
        if (tskRes.rows.length > 0) {
          this.tasks = tskRes.rows;
        }
      } catch (e) {}

      // 15. Check app_state for fallback JSON and audit logs
      try {
        const res = await client.query(`SELECT data FROM public.app_state WHERE id = 'latest_store'`);
        if (res.rows.length > 0 && res.rows[0].data) {
          const data = res.rows[0].data;
          if (data.auditLogs && data.auditLogs.length > 0) {
            this.auditLogs = data.auditLogs;
          }
        }
      } catch (e) {}

      client.release();
      console.log(`[PostgreSQL DB] State successfully loaded directly from PostgreSQL relational tables.`);
    } catch (err: any) {
      console.warn(`[PostgreSQL DB Load Warning] Could not load from PostgreSQL: ${err.message}.`);
    }
  }

  // Persist state directly into PostgreSQL database using DATABASE_URL
  async save() {
    try {
      const data = {
        organizations: this.organizations,
        users: this.users,
        superAdminUsers: this.superAdminUsers,
        categories: this.categories,
        products: this.products,
        inventoryItems: this.inventoryItems,
        inventoryMovements: this.inventoryMovements,
        clients: this.clients,
        orders: this.orders,
        paymentMethods: this.paymentMethods,
        sales: this.sales,
        ledgerAccounts: this.ledgerAccounts,
        ledgerEntries: this.ledgerEntries,
        tasks: this.tasks,
        auditLogs: this.auditLogs
      };

      await pgPool.query(
        `INSERT INTO public.app_state (id, data, updated_at) VALUES ('latest_store', $1, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(data)]
      );
    } catch (err: any) {
      console.error('[PostgreSQL DB Save Error] Failed to persist data to PostgreSQL database:', err.message);
    }
  }
}

export const dbStore = new DbStore();
