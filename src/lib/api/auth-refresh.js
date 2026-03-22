import { apiUrl } from './config';
import { saveAuthSession } from '@/lib/auth/session';
import {
  redirectToServerMaintenancePage,
  redirectToServerUnreachable,
} from '@/lib/maintenance-redirect';

let refreshInFlight = null;

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    redirectToServerUnreachable();
    return null;
  }
}

/**
 * Minta access token baru memakai refresh token (SimpleJWT).
 * @returns {Promise<boolean>} true jika access tersimpan
 */
export function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  const refresh =
    typeof localStorage !== 'undefined' ? localStorage.getItem('anomath_refresh') : null;
  if (!refresh) {
    return Promise.resolve(false);
  }
  refreshInFlight = (async () => {
    try {
      const res = await safeFetch(apiUrl('/api/auth/token/refresh/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (res?.status >= 500 && res.status < 600) {
        redirectToServerMaintenancePage(res.status);
        return false;
      }
      const text = (await res?.text?.()) ?? '';
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        return false;
      }
      if (!res?.ok || !json.access) return false;
      saveAuthSession({
        access: json.access,
        ...(json.refresh ? { refresh: json.refresh } : {}),
      });
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}
