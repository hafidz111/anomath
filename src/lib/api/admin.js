import { apiFetch } from './client';

/** GET /api/admin/stats/ */
export function fetchAdminStats() {
  return apiFetch('/api/admin/stats/');
}

/** GET /api/admin/users/ */
export function fetchAdminUsers(params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.page_size) q.set('page_size', String(params.page_size));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiFetch(`/api/admin/users/${suffix}`);
}

/** GET /api/admin/users/:id/ — detail */
export function fetchAdminUser(userId) {
  return apiFetch(`/api/admin/users/${userId}/`);
}

/** PATCH /api/admin/users/:id/ — edit / suspend (is_active) */
export function updateAdminUser(userId, payload) {
  return apiFetch(`/api/admin/users/${userId}/`, { method: 'PATCH', body: payload });
}

/** DELETE /api/admin/users/:id/ */
export function deleteAdminUser(userId) {
  return apiFetch(`/api/admin/users/${userId}/`, { method: 'DELETE' });
}

/** GET /api/admin/classes/ */
export function fetchAdminClasses(params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.page_size) q.set('page_size', String(params.page_size));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiFetch(`/api/admin/classes/${suffix}`);
}

/** GET /api/admin/classes/:id/ */
export function fetchAdminClass(classId) {
  return apiFetch(`/api/admin/classes/${classId}/`);
}

/** POST /api/admin/classes/ */
export function createAdminClass(payload) {
  return apiFetch('/api/admin/classes/', { method: 'POST', body: payload });
}

/** PATCH /api/admin/classes/:id/ */
export function updateAdminClass(classId, payload) {
  return apiFetch(`/api/admin/classes/${classId}/`, { method: 'PATCH', body: payload });
}

/** DELETE /api/admin/classes/:id/ */
export function deleteAdminClass(classId) {
  return apiFetch(`/api/admin/classes/${classId}/`, { method: 'DELETE' });
}

/** GET /api/admin/cases/ */
export function fetchAdminCases(params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.page_size) q.set('page_size', String(params.page_size));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiFetch(`/api/admin/cases/${suffix}`);
}

/** GET /api/admin/puzzles/ */
export function fetchAdminPuzzles(params = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.page_size) q.set('page_size', String(params.page_size));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiFetch(`/api/admin/puzzles/${suffix}`);
}

/** GET /api/admin/leaderboard/ — ranking siswa (skor progres) */
export function fetchAdminLeaderboard(params = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiFetch(`/api/admin/leaderboard/${suffix}`);
}

/** GET /api/admin/leaderboard/classes/ — per-class rankings */
export function fetchAdminLeaderboardClasses(params = {}) {
  const q = new URLSearchParams();
  if (params.limit_per_class) q.set('limit_per_class', String(params.limit_per_class));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiFetch(`/api/admin/leaderboard/classes/${suffix}`);
}

/**
 * GET /api/admin/leaderboard/teams/
 * Disarankan: { classes: [ { class_id, name, teams: [ { team_id, name, total_score, members, rank } ] } ] }
 * Didukung juga: { teams: [ ... ] } flat dengan class_id + team_id/team_name per baris (akan digroup di UI).
 */
export function fetchAdminLeaderboardTeams() {
  return apiFetch('/api/admin/leaderboard/teams/');
}

/** GET /api/admin/settings/ — platform settings (singleton) */
export function fetchAdminSettings() {
  return apiFetch('/api/admin/settings/');
}

/** PATCH /api/admin/settings/ — update platform settings */
export function patchAdminSettings(payload) {
  return apiFetch('/api/admin/settings/', { method: 'PATCH', body: payload });
}
