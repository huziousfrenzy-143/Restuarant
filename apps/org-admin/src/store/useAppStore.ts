import { create } from 'zustand';
import {
  Order,
  OrderItem,
  OrderStatus,
  Product,
  InventoryItem,
  Sale,
  LedgerAccount,
  LedgerEntry,
  Task,
  Client,
  Organization,
  User,
  ProductCategory,
  PaymentMethod
} from '@restaurant-saas/shared-schemas';

import { getAuthToken, saveAuthToken, clearAuthToken } from '../utils/cookieUtils';

import { authApi } from '../api/auth.api';
import { productsApi } from '../api/products.api';
import { categoriesApi } from '../api/categories.api';
import { inventoryApi } from '../api/inventory.api';
import { clientsApi } from '../api/clients.api';
import { ordersApi } from '../api/orders.api';
import { salesApi } from '../api/sales.api';
import { usersApi } from '../api/users.api';
import { tasksApi } from '../api/tasks.api';
import { paymentMethodsApi } from '../api/paymentMethods.api';
import { ledgerApi } from '../api/ledger.api';
import { settingsApi } from '../api/settings.api';

interface AppState {
  // Session & Tenant State
  isAuthenticated: boolean;
  currentUser: User | null;
  org: Organization;
  userOrgs: any[];
  activeTab: string;
  isLineMode: boolean;

  // Domain Entity Collections
  products: Product[];
  categories: ProductCategory[];
  inventory: InventoryItem[];
  clients: Client[];
  orders: Order[];
  sales: Sale[];
  users: User[];
  paymentMethods: PaymentMethod[];
  accounts: LedgerAccount[];
  entries: LedgerEntry[];
  tasks: Task[];

  // Action Loading Toast State
  isActionLoading: boolean;
  actionMessage: string;

  // State Mutators
  setIsAuthenticated: (auth: boolean) => void;
  setCurrentUser: (user: User | null) => void;
  setOrg: (org: Organization) => void;
  setUserOrgs: (userOrgs: any[]) => void;
  setActiveTab: (tab: string) => void;
  setIsLineMode: (isLineMode: boolean) => void;
  setActionLoading: (loading: boolean, message?: string) => void;
  runAction: <T>(message: string, actionFn: () => Promise<T>) => Promise<T | undefined>;

  // Data Synchronization & Auth Handlers
  syncApiData: (targetOrgId?: string) => Promise<void>;
  logout: () => void;
  switchOrg: (targetOrgId: string) => Promise<void>;

  // CRUD Actions
  addProduct: (input: any) => Promise<void>;
  updateProduct: (id: string, updates: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addCategory: (input: any) => Promise<void>;
  updateCategory: (id: string, updates: any) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addInventoryItem: (input: any) => Promise<void>;
  updateInventoryItem: (id: string, updates: any) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;

  addClient: (input: any) => Promise<void>;
  updateClient: (id: string, updates: any) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  payCreditBalance: (clientId: string, amount: number, paymentMethod: string) => Promise<void>;

  addUser: (input: any) => Promise<void>;
  updateUser: (id: string, updates: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  addTask: (input: any) => Promise<void>;
  updateTask: (id: string, updates: any) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string, currentStatus: string) => Promise<void>;

  addPaymentMethod: (input: any) => Promise<void>;
  updatePaymentMethod: (id: string, updates: any) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;

  addAccount: (input: any) => Promise<void>;
  updateAccount: (id: string, updates: any) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addManualEntry: (input: any) => Promise<void>;

  updateOrgDetails: (updates: { name: string; phone: string; address: string; tax_rate: number }) => Promise<void>;
  updateOrderItems: (orderId: string, items: OrderItem[]) => Promise<void>;
  completePosOrder: (newOrderData: any, paymentMethod: string, amountPaid: number) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
}

const defaultOrg: Organization = {
  id: 'org-1',
  name: 'Saffron Lounge',
  slug: 'saffron-lounge',
  schema_name: 'tenant_saffron',
  plan_type: 'enterprise',
  subscription_status: 'active',
  subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  tax_rate: 10,
  address: 'Main Boulevard',
  phone: '+1 (555) 000-0000',
  created_at: new Date().toISOString(),
  is_active: true
};

const getInitialUser = () => {
  const stored = localStorage.getItem('org_admin_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return null;
};

const initialUser = getInitialUser();

export const useAppStore = create<AppState>((set, get) => ({
  // Session & Tenant State
  isAuthenticated: Boolean(getAuthToken()),
  currentUser: initialUser,
  org: initialUser?.org || defaultOrg,
  userOrgs: initialUser?.userOrgs || [initialUser?.org || defaultOrg],
  activeTab: 'dashboard',
  isLineMode: false,

  // Domain Entity Collections
  products: [],
  categories: [],
  inventory: [],
  clients: [],
  orders: [],
  sales: [],
  users: [],
  paymentMethods: [],
  accounts: [],
  entries: [],
  tasks: [],

  // Action Loading Toast State
  isActionLoading: false,
  actionMessage: 'Processing...',

  // State Mutators
  setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setOrg: (org) => set({ org }),
  setUserOrgs: (userOrgs) => set({ userOrgs }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsLineMode: (isLineMode) => set({ isLineMode }),
  setActionLoading: (loading, message = 'Processing...') => set({ isActionLoading: loading, actionMessage: message }),

  runAction: async (msg, fn) => {
    set({ isActionLoading: true, actionMessage: msg });
    try {
      return await fn();
    } catch (err) {
      console.error(`Action Error (${msg}):`, err);
    } finally {
      set({ isActionLoading: false });
    }
  },

  logout: () => {
    clearAuthToken();
    set({ currentUser: null, isAuthenticated: false });
  },

  syncApiData: async (targetOrgId) => {
    const { org } = get();
    const activeOrgId = targetOrgId || org.id;
    if (!activeOrgId) return;

    try {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const [users, prods, cats, inv, clis, ords, sls, pms, accs, ents, tsks] = await Promise.all([
        usersApi.getAll(activeOrgId).catch(() => []),
        productsApi.getAll(activeOrgId).catch(() => []),
        categoriesApi.getAll(activeOrgId).catch(() => []),
        inventoryApi.getAll(activeOrgId).catch(() => []),
        clientsApi.getAll(activeOrgId).catch(() => []),
        ordersApi.getAll(activeOrgId).catch(() => []),
        salesApi.getAll(activeOrgId).catch(() => []),
        paymentMethodsApi.getAll(activeOrgId).catch(() => []),
        ledgerApi.getAccounts(activeOrgId).catch(() => []),
        ledgerApi.getEntries(activeOrgId).catch(() => []),
        tasksApi.getAll(activeOrgId).catch(() => [])
      ]);

      set({
        users,
        products: prods,
        categories: cats,
        inventory: inv,
        clients: clis,
        orders: ords,
        sales: sls,
        paymentMethods: pms,
        accounts: accs,
        entries: ents,
        tasks: tsks
      });
    } catch (err) {
      console.error('Error syncing store data:', err);
    }
  },

  switchOrg: async (targetOrgId) => {
    const { runAction, syncApiData } = get();
    await runAction('Switching Organization...', async () => {
      const data = await authApi.switchOrg(targetOrgId);
      if (data) {
        const { accessToken, refreshToken, user, userOrgs: newOrgs } = data;
        saveAuthToken(accessToken, refreshToken, user);
        if (user) {
          set({
            currentUser: user,
            org: user.org || get().org,
            activeTab: user.role === 'chef' ? 'kds' : user.role === 'salesman' ? 'pos' : user.role === 'delivery_boy' ? 'orders' : 'dashboard',
            isLineMode: user.role === 'chef'
          });
        }
        if (newOrgs) set({ userOrgs: newOrgs });
        await syncApiData(targetOrgId);
      }
    });
  },

  // Products CRUD
  addProduct: (input) => get().runAction('Saving Product...', async () => {
    await productsApi.create(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  updateProduct: (id, updates) => get().runAction('Updating Product...', async () => {
    await productsApi.update(get().org.id, id, updates);
    await get().syncApiData(get().org.id);
  }),

  deleteProduct: (id) => get().runAction('Deleting Product...', async () => {
    await productsApi.delete(get().org.id, id);
    await get().syncApiData(get().org.id);
  }),

  // Categories CRUD
  addCategory: (input) => get().runAction('Saving Category...', async () => {
    await categoriesApi.create(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  updateCategory: (id, updates) => get().runAction('Updating Category...', async () => {
    await categoriesApi.update(get().org.id, id, updates);
    await get().syncApiData(get().org.id);
  }),

  deleteCategory: (id) => get().runAction('Deleting Category...', async () => {
    await categoriesApi.delete(get().org.id, id);
    await get().syncApiData(get().org.id);
  }),

  // Inventory CRUD
  addInventoryItem: (input) => get().runAction('Adding Inventory Item...', async () => {
    await inventoryApi.create(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  updateInventoryItem: (id, updates) => get().runAction('Updating Inventory Item...', async () => {
    await inventoryApi.update(get().org.id, id, updates);
    await get().syncApiData(get().org.id);
  }),

  deleteInventoryItem: (id) => get().runAction('Deleting Inventory Item...', async () => {
    await inventoryApi.delete(get().org.id, id);
    await get().syncApiData(get().org.id);
  }),

  // Clients CRUD
  addClient: (input) => get().runAction('Saving Customer Profile...', async () => {
    await clientsApi.create(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  updateClient: (id, updates) => get().runAction('Updating Customer Profile...', async () => {
    await clientsApi.update(get().org.id, id, updates);
    await get().syncApiData(get().org.id);
  }),

  deleteClient: (id) => get().runAction('Deleting Customer Profile...', async () => {
    await clientsApi.delete(get().org.id, id);
    await get().syncApiData(get().org.id);
  }),

  payCreditBalance: (clientId, amount, paymentMethod) => get().runAction('Recording Credit Settlement...', async () => {
    await clientsApi.payCredit(get().org.id, clientId, amount, paymentMethod);
    await get().syncApiData(get().org.id);
  }),

  // Users CRUD
  addUser: (input) => get().runAction('Creating Staff Account...', async () => {
    await usersApi.create(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  updateUser: (id, updates) => get().runAction('Updating Staff Account...', async () => {
    await usersApi.update(get().org.id, id, updates);
    await get().syncApiData(get().org.id);
  }),

  deleteUser: (id) => get().runAction('Deleting Staff Account...', async () => {
    await usersApi.delete(get().org.id, id);
    await get().syncApiData(get().org.id);
  }),

  // Tasks CRUD
  addTask: (input) => get().runAction('Creating Task...', async () => {
    await tasksApi.create(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  updateTask: (id, updates) => get().runAction('Updating Task...', async () => {
    await tasksApi.update(get().org.id, id, updates);
    await get().syncApiData(get().org.id);
  }),

  deleteTask: (id) => get().runAction('Deleting Task...', async () => {
    await tasksApi.delete(get().org.id, id);
    await get().syncApiData(get().org.id);
  }),

  toggleTaskStatus: (id, currentStatus) => get().runAction('Updating Task Status...', async () => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    await tasksApi.updateStatus(get().org.id, id, nextStatus);
    await get().syncApiData(get().org.id);
  }),

  // Payment Methods & Ledger
  addPaymentMethod: (input) => get().runAction('Adding Payment Method...', async () => {
    await paymentMethodsApi.create(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  updatePaymentMethod: (id, updates) => get().runAction('Updating Payment Method...', async () => {
    await paymentMethodsApi.update(get().org.id, id, updates);
    await get().syncApiData(get().org.id);
  }),

  deletePaymentMethod: (id) => get().runAction('Deleting Payment Method...', async () => {
    await paymentMethodsApi.delete(get().org.id, id);
    await get().syncApiData(get().org.id);
  }),

  addAccount: (input) => get().runAction('Adding Ledger Account...', async () => {
    await ledgerApi.createAccount(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  updateAccount: (id, updates) => get().runAction('Updating Ledger Account...', async () => {
    await ledgerApi.updateAccount(get().org.id, id, updates);
    await get().syncApiData(get().org.id);
  }),

  deleteAccount: (id) => get().runAction('Deleting Ledger Account...', async () => {
    await ledgerApi.deleteAccount(get().org.id, id);
    await get().syncApiData(get().org.id);
  }),

  addManualEntry: (input) => get().runAction('Recording Ledger Entry...', async () => {
    await ledgerApi.createEntry(get().org.id, input);
    await get().syncApiData(get().org.id);
  }),

  // Org Settings & Orders
  updateOrgDetails: (updates) => get().runAction('Saving Restaurant Settings...', async () => {
    set({ org: { ...get().org, ...updates } });
    await settingsApi.updateSettings(get().org.id, updates);
    await get().syncApiData(get().org.id);
  }),

  updateOrderItems: (orderId, items) => get().runAction('Updating Order Items...', async () => {
    await ordersApi.updateItems(get().org.id, orderId, items);
    await get().syncApiData(get().org.id);
  }),

  completePosOrder: (newOrderData, paymentMethod, amountPaid) => get().runAction('Processing POS Order...', async () => {
    const orgId = get().org.id;
    const newOrder = await ordersApi.create(orgId, newOrderData);

    if (newOrder) {
      await salesApi.create(orgId, {
        order_id: newOrder.id,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        amount_due: 0
      });

      if (paymentMethod === 'borrow_credit' && newOrderData.client_id) {
        const targetClient = get().clients.find(c => c.id === newOrderData.client_id);
        if (targetClient) {
          const updatedBalance = Number(targetClient.credit_balance || 0) + Number(amountPaid);
          await clientsApi.update(orgId, targetClient.id, { credit_balance: updatedBalance });
        }
      }

      await get().syncApiData(orgId);
    }
  }),

  updateOrderStatus: (orderId, newStatus) => get().runAction(`Updating Order Status (${newStatus})...`, async () => {
    await ordersApi.updateStatus(get().org.id, orderId, newStatus);
    await get().syncApiData(get().org.id);
  })
}));
