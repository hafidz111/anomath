import { apiUrl } from './config';
import { refreshAccessToken } from './auth-refresh';
import { clearAuthSession } from '@/lib/auth/session';
import {
  redirectToServerMaintenancePage,
  redirectToServerUnreachable,
} from '@/lib/maintenance-redirect';

function parseErrorMessage(payload) {
  if (!payload || typeof payload !== 'object') return 'Request failed';
  if (payload.message) return payload.message;
  try {
    return JSON.stringify(payload);
  } catch {
    return 'Request failed';
  }
}

function errorMessageFromJson(json, res) {
  const msg =
    json.detail ||
    json.message ||
    (res.status === 401
      ? 'Sesi habis. Silakan login lagi.'
      : res.status === 403
        ? 'Akses ditolak.'
        : `HTTP ${res.status}`);
  return typeof msg === 'string' ? msg : JSON.stringify(msg);
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    redirectToServerUnreachable();
    throw new Error('Tidak bisa terhubung ke server.');
  }
}

/**
 * Authenticated JSON API (Bearer dari localStorage).
 * 401 + refresh tersedia → coba `/api/auth/token/refresh/` lalu ulang request sekali.
 * @returns {Promise<*>} envelope `data`
 */
export async function apiFetch(path, options = {}, isRetry = false) {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('anomath_access') : null;
  const headers = { Accept: 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = options.body;
  if (body != null && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await safeFetch(apiUrl(path), { ...options, body, headers });
  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      if (!res.ok && res.status >= 500 && res.status < 600) {
        redirectToServerMaintenancePage(res.status);
        throw new Error('Server sedang bermasalah. Silakan coba lagi nanti.');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      throw new Error(res.status === 502 ? 'Proxy/backend gagal (502).' : 'Invalid JSON');
    }
  }

  if (!res.ok && res.status >= 500 && res.status < 600) {
    redirectToServerMaintenancePage(res.status);
    throw new Error('Server sedang bermasalah. Silakan coba lagi nanti.');
  }

  if (!res.ok && res.status === 401 && !isRetry && token) {
    const hasRefresh =
      typeof localStorage !== 'undefined' && localStorage.getItem('anomath_refresh');
    if (hasRefresh) {
      const ok = await refreshAccessToken();
      if (ok) {
        return apiFetch(path, options, true);
      }
    }
    clearAuthSession();
    const onLogin =
      typeof window !== 'undefined' && window.location.pathname === '/login';
    if (!onLogin && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('anomath:session-expired', {
          detail: {
            code: json.code,
            reason: 'unauthorized',
            messages: json.messages,
          },
        }),
      );
      window.location.assign('/login');
    }
    throw new Error('Sesi habis. Silakan login lagi.');
  }

  if (!res.ok) {
    throw new Error(errorMessageFromJson(json, res));
  }
  if (!text) {
    if (res.status === 204 || res.status === 205) {
      return { success: true, data: null };
    }
    if (res.status === 502 || res.status === 503) {
      throw new Error('Backend tidak tersedia.');
    }
    throw new Error(`HTTP ${res.status}`);
  }
  if (json.success === false) {
    throw new Error(parseErrorMessage(json));
  }
  if (json.success === true && 'data' in json) {
    return json.data;
  }
  if (json.success === true && json.data === null) {
    return null;
  }
  return json;
}
