import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, Client } from '@restaurant-saas/shared-schemas';

export interface PendingSyncItem {
  id: string;
  type: 'CREATE_ORDER' | 'UPDATE_ORDER_STATUS' | 'CREATE_CLIENT' | 'UPDATE_CLIENT' | 'PAY_CLIENT_CREDIT' | 'DELETE_CLIENT';
  payload: any;
  timestamp: string;
}

const STORAGE_KEYS = {
  ORDERS: '@saffron_mobile_orders',
  CLIENTS: '@saffron_mobile_clients',
  PRODUCTS: '@saffron_mobile_products',
  INVENTORY: '@saffron_mobile_inventory',
  PENDING_QUEUE: '@saffron_mobile_pending_queue',
  AUTH_TOKEN: '@saffron_mobile_token',
  REFRESH_TOKEN: '@saffron_mobile_refresh_token',
  USER_DATA: '@saffron_mobile_user',
  USER_ORGS: '@saffron_mobile_user_orgs'
};

// Generic JSON Storage Helpers
export async function saveLocalItem<T>(key: string, value: T): Promise<void> {
  try {
    const jsonStr = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonStr);
  } catch (err) {
    console.warn('[Storage Error] Failed to save item:', key, err);
  }
}

export async function getLocalItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const jsonStr = await AsyncStorage.getItem(key);
    if (!jsonStr) return defaultValue;
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.warn('[Storage Error] Failed to read item:', key, err);
    return defaultValue;
  }
}

// Persistent Auth Session Storage Helpers
export async function saveAuthSession(token: string, refreshToken?: string, user?: any, userOrgs?: any[]): Promise<void> {
  if (token) await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  if (refreshToken) await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  if (user) await saveLocalItem(STORAGE_KEYS.USER_DATA, user);
  if (userOrgs) await saveLocalItem(STORAGE_KEYS.USER_ORGS, userOrgs);
}

export async function getAuthSession(): Promise<{ token: string | null; refreshToken: string | null; user: any | null; userOrgs: any[] }> {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const user = await getLocalItem<any | null>(STORAGE_KEYS.USER_DATA, null);
    const userOrgs = await getLocalItem<any[]>(STORAGE_KEYS.USER_ORGS, []);
    return { token, refreshToken, user, userOrgs };
  } catch (err) {
    return { token: null, refreshToken: null, user: null, userOrgs: [] };
  }
}

export async function clearAuthSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_ORGS);
  } catch (err) {}
}

// Local Orders Persistence
export async function saveLocalOrders(orders: Order[]): Promise<void> {
  await saveLocalItem(STORAGE_KEYS.ORDERS, orders);
}

export async function getLocalOrders(): Promise<Order[]> {
  return await getLocalItem<Order[]>(STORAGE_KEYS.ORDERS, []);
}

// Local Clients Persistence
export async function saveLocalClients(clients: Client[]): Promise<void> {
  await saveLocalItem(STORAGE_KEYS.CLIENTS, clients);
}

export async function getLocalClients(): Promise<Client[]> {
  return await getLocalItem<Client[]>(STORAGE_KEYS.CLIENTS, []);
}

// Pending Sync Queue Management
export async function getPendingSyncQueue(): Promise<PendingSyncItem[]> {
  return await getLocalItem<PendingSyncItem[]>(STORAGE_KEYS.PENDING_QUEUE, []);
}

export async function addPendingSyncItem(item: Omit<PendingSyncItem, 'id' | 'timestamp'>): Promise<PendingSyncItem[]> {
  const currentQueue = await getPendingSyncQueue();
  const newItem: PendingSyncItem = {
    ...item,
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };
  const updatedQueue = [...currentQueue, newItem];
  await saveLocalItem(STORAGE_KEYS.PENDING_QUEUE, updatedQueue);
  return updatedQueue;
}

export async function clearPendingSyncQueue(): Promise<void> {
  await saveLocalItem(STORAGE_KEYS.PENDING_QUEUE, []);
}
