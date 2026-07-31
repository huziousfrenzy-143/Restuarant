export function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`;
}

export function getCookie(name: string): string | null {
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export function deleteCookie(name: string) {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${secureFlag}`;
}

export function getAuthToken(): string | null {
  return getCookie('org_admin_token') || localStorage.getItem('org_admin_token') || null;
}

export function saveAuthToken(accessToken: string, refreshToken?: string, user?: any) {
  if (accessToken) {
    setCookie('org_admin_token', accessToken, 7);
    localStorage.setItem('org_admin_token', accessToken);
  }
  if (refreshToken) {
    setCookie('org_admin_refresh_token', refreshToken, 30);
    localStorage.setItem('org_admin_refresh_token', refreshToken);
  }
  if (user) {
    localStorage.setItem('org_admin_user', JSON.stringify(user));
  }
}

export function clearAuthToken() {
  deleteCookie('org_admin_token');
  deleteCookie('org_admin_refresh_token');
  localStorage.removeItem('org_admin_token');
  localStorage.removeItem('org_admin_refresh_token');
  localStorage.removeItem('org_admin_user');
}
