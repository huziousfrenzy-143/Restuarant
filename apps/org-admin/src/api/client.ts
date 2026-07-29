import { Order, Product, InventoryItem, Sale, Task, Organization } from '@restaurant-saas/shared-schemas';
import { API_BASE_URL } from '../config/api';

export async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token-org-1`,
        ...(options?.headers || {})
      },
      ...options
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn(`[API Client] Fallback mode active for ${endpoint}:`, err);
    throw err;
  }
}
