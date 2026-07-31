// Production React Native Mobile API Client for Saffron SaaS Backend
import { Product, Order, InventoryItem, OrderStatus, Client, ProductCategory } from '@restaurant-saas/shared-schemas';

export const API_BASE_URL = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL ? process.env.EXPO_PUBLIC_API_URL : 'https://restuarants-api.vercel.app/api/v1').replace(/\/$/, '');

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export function getApiAuthToken() {
  return authToken;
}

export async function fetchMobileJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string> || {})
    },
    ...options
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

// 1. Staff Step 1: Request 6-digit Email OTP (POST /api/v1/auth/request-otp)
export async function requestOtpApi(email: string, password?: string) {
  const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: password || 'password123' })
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to request email OTP code');
  }
  return json.data || { success: true };
}

// 2. Staff Step 2: Verify OTP & Issue Token (POST /api/v1/auth/verify-otp)
export async function verifyOtpApi(email: string, otp: string, targetOrgId?: string) {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, targetOrgId })
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Invalid or expired OTP code');
  }
  const { accessToken, token, user, userOrgs } = json.data || {};
  const effectiveToken = accessToken || token;
  if (effectiveToken) {
    setApiAuthToken(effectiveToken);
  }
  return {
    user,
    org: user?.org,
    token: effectiveToken,
    userOrgs: userOrgs || []
  };
}

// Direct Login Fallback (POST /api/v1/auth/login)
export async function loginStaffApi(email: string, targetOrgId?: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, targetOrgId })
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Login failed');
  }
  const { accessToken, token, user, userOrgs } = json.data || {};
  const effectiveToken = accessToken || token;
  if (effectiveToken) {
    setApiAuthToken(effectiveToken);
  }
  return {
    user,
    org: user?.org,
    token: effectiveToken,
    userOrgs: userOrgs || []
  };
}

// 3. Multi-Tenant Organization Context Switcher (POST /api/v1/auth/switch-org)
export async function switchOrgApi(targetOrgId: string) {
  const res = await fetch(`${API_BASE_URL}/auth/switch-org`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify({ targetOrgId })
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to switch organization context');
  }
  const { accessToken, token, user, userOrgs } = json.data || {};
  const effectiveToken = accessToken || token;
  if (effectiveToken) {
    setApiAuthToken(effectiveToken);
  }
  return {
    user,
    org: user?.org,
    token: effectiveToken,
    userOrgs: userOrgs || []
  };
}

// 4. Fetch Store Products (GET /api/v1/:orgId/products)
export async function fetchProductsApi(orgId: string): Promise<Product[]> {
  return await fetchMobileJson<Product[]>(`/${orgId}/products`);
}

// 5. Fetch Store Categories (GET /api/v1/:orgId/categories)
export async function fetchCategoriesApi(orgId: string): Promise<ProductCategory[]> {
  return await fetchMobileJson<ProductCategory[]>(`/${orgId}/categories`);
}

// 6. Fetch Store Orders (GET /api/v1/:orgId/orders)
export async function fetchOrdersApi(orgId: string): Promise<Order[]> {
  return await fetchMobileJson<Order[]>(`/${orgId}/orders`);
}

// 7. Create New Order in POS (POST /api/v1/:orgId/orders)
export async function createOrderApi(orgId: string, orderPayload: any): Promise<Order> {
  return await fetchMobileJson<Order>(`/${orgId}/orders`, {
    method: 'POST',
    body: JSON.stringify(orderPayload)
  });
}

// 8. Update Order Status (PATCH /api/v1/:orgId/orders/:id/status)
export async function updateOrderStatusApi(orgId: string, orderId: string, status: OrderStatus): Promise<Order> {
  return await fetchMobileJson<Order>(`/${orgId}/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

// 9. Fetch Store Inventory (GET /api/v1/:orgId/inventory)
export async function fetchInventoryApi(orgId: string): Promise<InventoryItem[]> {
  return await fetchMobileJson<InventoryItem[]>(`/${orgId}/inventory`);
}

// 10. Fetch Store Clients / Customers (GET /api/v1/:orgId/clients)
export async function fetchClientsApi(orgId: string): Promise<Client[]> {
  return await fetchMobileJson<Client[]>(`/${orgId}/clients`);
}

// 11. Create New Store Client (POST /api/v1/:orgId/clients)
export async function createClientApi(orgId: string, clientPayload: Partial<Client>): Promise<Client> {
  return await fetchMobileJson<Client>(`/${orgId}/clients`, {
    method: 'POST',
    body: JSON.stringify(clientPayload)
  });
}

// 12. Update Existing Store Client (PUT /api/v1/:orgId/clients/:id)
export async function updateClientApi(orgId: string, clientId: string, clientPayload: Partial<Client>): Promise<Client> {
  return await fetchMobileJson<Client>(`/${orgId}/clients/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify(clientPayload)
  });
}

// 13. Pay Client Credit / Adjust Debt Balance (POST /api/v1/:orgId/clients/:id/pay-credit)
export async function payClientCreditApi(orgId: string, clientId: string, amount: number, paymentMethod: string = 'cash'): Promise<Client> {
  return await fetchMobileJson<Client>(`/${orgId}/clients/${clientId}/pay-credit`, {
    method: 'POST',
    body: JSON.stringify({ amount, payment_method: paymentMethod })
  });
}

// 14. Delete Store Client (DELETE /api/v1/:orgId/clients/:id)
export async function deleteClientApi(orgId: string, clientId: string): Promise<{ message: string }> {
  return await fetchMobileJson<{ message: string }>(`/${orgId}/clients/${clientId}`, {
    method: 'DELETE'
  });
}

