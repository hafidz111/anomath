import { apiFetch } from './client';

/** GET /api/progress/ */
export function listProgress() {
  return apiFetch('/api/progress/');
}

/** GET /api/progress/:caseId/ */
export function getProgress(caseId) {
  return apiFetch(`/api/progress/${caseId}/`);
}
