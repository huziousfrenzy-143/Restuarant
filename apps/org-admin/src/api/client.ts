import { API_BASE_URL } from '../config/api';
import { getAuthToken, getRefreshToken, saveAuthToken, clearAuthToken } from '../utils/cookieUtils';

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const errBody = await res.clone().json().catch(() => ({}));
    
    if (res.status === 401 && errBody.error?.code === 'UNAUTHORIZED') {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newAccessToken = refreshData.data.accessToken;
              const newRefreshToken = refreshData.data.refreshToken;
              saveAuthToken(newAccessToken, newRefreshToken);
              onRefreshed(newAccessToken);
            } else {
              clearAuthToken();
              window.location.href = '/login';
              throw new Error('Session expired. Please log in again.');
            }
          } catch (e) {
            clearAuthToken();
            window.location.href = '/login';
            throw e;
          } finally {
            isRefreshing = false;
          }
        }

        const newAccessToken = await new Promise<string>(resolve => {
          refreshSubscribers.push(resolve);
        });

        res = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            ...getAuthHeaders(),
            ...(options?.headers || {}),
            Authorization: `Bearer ${newAccessToken}`
          },
          ...options
        });

        if (!res.ok) {
          const retryErrBody = await res.json().catch(() => ({}));
          throw new Error(retryErrBody.error?.message || `HTTP ${res.status}`);
        }
      } else {
        const msg = errBody.error?.details ? `${errBody.error?.message}: ${JSON.stringify(errBody.error.details)}` : errBody.error?.message;
        throw new Error(msg || `HTTP ${res.status}`);
      }
    } else {
      const msg = errBody.error?.details ? `${errBody.error?.message}: ${JSON.stringify(errBody.error.details)}` : errBody.error?.message;
      throw new Error(msg || `HTTP ${res.status}`);
    }
  }

  const json = await res.json();
  return json.data;
}

export const apiGet = <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' });
export const apiPost = <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
export const apiPatch = <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' });
