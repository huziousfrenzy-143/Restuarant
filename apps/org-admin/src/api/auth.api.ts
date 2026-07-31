import { API_BASE_URL } from '../config/api';
import { getAuthHeaders } from './client';

export const authApi = {
  switchOrg: async (targetOrgId: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/switch-org`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetOrgId })
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to switch organization context');
    }
    return json.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await fetch(`${API_BASE_URL.replace('/v1', '')}/v1/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.error?.message || 'Password update failed' };
    }
    return { success: true, message: json.message };
  }
};
