import { API_BASE_URL } from '../config/api';
import { getAuthToken } from '../utils/cookieUtils';

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      ...getAuthHeaders(),
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
}

export const apiGet = <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' });
export const apiPost = <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
export const apiPatch = <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' });
