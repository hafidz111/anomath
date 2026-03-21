/** Base URL for API calls (same as auth). */
export function apiUrl(path) {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (base) return `${String(base).replace(/\/$/, '')}${path}`;
  return path;
}
