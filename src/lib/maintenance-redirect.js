/**
 * Alihkan ke halaman maintenance untuk masalah di sisi server:
 * HTTP 5xx, backend tidak terjangkau, atau koneksi putus.
 * Modul mandiri agar aman diimpor dari client/auth tanpa siklus dependensi.
 */
export function redirectToServerMaintenancePage(statusCode = 500) {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  if (path.startsWith('/maintenance')) return;
  const q = new URLSearchParams({ reason: 'server' });
  if (statusCode != null && Number(statusCode) !== 500) {
    q.set('code', String(statusCode));
  }
  window.location.replace(`/maintenance?${q.toString()}`);
}

/** Gagal fetch (jaringan / server tidak menjawab) — tampilkan halaman maintenance yang sama. */
export function redirectToServerUnreachable() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  if (path.startsWith('/maintenance')) return;
  const q = new URLSearchParams({ reason: 'server', network: '1' });
  window.location.replace(`/maintenance?${q.toString()}`);
}
