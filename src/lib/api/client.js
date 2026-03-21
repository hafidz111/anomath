import { apiUrl } from './config';

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
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      throw new Error(res.status === 502 ? 'Proxy/backend gagal (502).' : 'Invalid JSON');
    }
  }
  if (!res.ok) {
    const msg =
      json.detail ||
      json.message ||
      (res.status === 401
        ? 'Sesi habis. Silakan login lagi.'
        : res.status === 403
          ? 'Akses ditolak.'
          : `HTTP ${res.status}`);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
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
  return json;
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(
      'Tidak bisa terhubung ke API. Pastikan backend jalan (port 8000).'
    );
  }
}

/**
 * Authenticated JSON API (Bearer dari localStorage).
 * @returns {Promise<*>} envelope `data`
 */
export async function apiFetch(path, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('anomath_access') : null;
  const headers = { Accept: 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = options.body;
  if (body != null && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await safeFetch(apiUrl(path), { ...options, body, headers });
  const json = await parseResponse(res);
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
