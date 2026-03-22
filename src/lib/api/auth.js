/**
 * ANOMATH backend auth (Django REST).
 * Env: VITE_API_BASE_URL — kosong = pakai path relatif `/api` (butuh proxy Vite).
 */

import { apiUrl } from './config';
import { apiFetch } from './client';
import {
  redirectToServerMaintenancePage,
  redirectToServerUnreachable,
} from '@/lib/maintenance-redirect';

export { saveAuthSession, clearAuthSession } from '@/lib/auth/session';

function parseErrorMessage(payload) {
  if (!payload || typeof payload !== 'object') return 'Request failed';
  if (payload.message) return payload.message;
  try {
    return JSON.stringify(payload);
  } catch {
    return 'Request failed';
  }
}

async function parseResponse(res) {
  if (res.status >= 500 && res.status < 600) {
    redirectToServerMaintenancePage(res.status);
    throw new Error('Server sedang bermasalah. Silakan coba lagi nanti.');
  }
  const text = await res.text();
  if (!text) {
    if (res.status === 502 || res.status === 503) {
      throw new Error(
        'Backend tidak tersedia (502). Jalankan Django: cd anomath-backend && python manage.py runserver — pastikan port 8000.'
      );
    }
    throw new Error(`HTTP ${res.status}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      res.status === 502
        ? 'Proxy/backend gagal (502). Jalankan Django di http://127.0.0.1:8000 atau set VITE_API_BASE_URL di .env'
        : `Invalid response (HTTP ${res.status})`
    );
  }
}

/**
 * POST /api/auth/login/
 * @returns {Promise<{ access: string, refresh: string, user: object }>}
 */
async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    redirectToServerUnreachable();
    throw new Error('Tidak bisa terhubung ke server.');
  }
}

export async function login({ email, password }) {
  const res = await safeFetch(apiUrl('/api/auth/login/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await parseResponse(res);
  if (!json.success) {
    throw new Error(parseErrorMessage(json));
  }
  return json.data;
}

/**
 * POST /api/auth/register/
 * @returns {Promise<{ access: string, refresh: string, user: object }>}
 */
export async function register({ name, email, password, role }) {
  const res = await safeFetch(apiUrl('/api/auth/register/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
  const json = await parseResponse(res);
  if (!json.success) {
    throw new Error(parseErrorMessage(json));
  }
  return json.data;
}

/** GET /api/auth/me/ — butuh Bearer (pakai apiFetch). */
export function fetchMe() {
  return apiFetch('/api/auth/me/');
}
