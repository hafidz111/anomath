import { apiFetch } from './client';

/** GET /api/badges/ */
export function listBadges() {
  return apiFetch('/api/badges/');
}

/** GET /api/users/me/badges/ */
export function listMyBadges() {
  return apiFetch('/api/users/me/badges/');
}
