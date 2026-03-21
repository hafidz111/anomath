/**
 * ANOMATH backend auth (Django REST).
 * Env: VITE_API_BASE_URL — kosong = pakai path relatif `/api` (butuh proxy Vite).
 */

import { apiUrl } from './config';
import { apiFetch } from './client';

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

export function saveAuthSession(data) {
  if (!data) return;
  if (data.access) localStorage.setItem('anomath_access', data.access);
  if (data.refresh) localStorage.setItem('anomath_refresh', data.refresh);
  if (data.user) {
    const roleNorm = String(data.user.role ?? '')
      .toLowerCase()
      .trim();
    if (roleNorm) localStorage.setItem('anomath_role', roleNorm);
    localStorage.setItem('anomath_user', JSON.stringify(data.user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem('anomath_access');
  localStorage.removeItem('anomath_refresh');
  localStorage.removeItem('anomath_user');
  localStorage.removeItem('anomath_role');
}

/**
 * POST /api/auth/login/
 * @returns {Promise<{ access: string, refresh: string, user: object }>}
 */
async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(
      'Tidak bisa terhubung ke API. Jalankan backend: cd anomath-backend && python manage.py runserver (port 8000), lalu restart npm run dev jika baru mengubah .env.'
    );
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
