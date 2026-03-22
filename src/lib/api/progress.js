import { apiFetch } from './client';

/** GET /api/progress/ */
export function listProgress() {
  return apiFetch('/api/progress/');
}

/** GET /api/progress/:caseId/ */
export function getProgress(caseId) {
  return apiFetch(`/api/progress/${caseId}/`);
}

/**
 * POST /api/progress/reset/ — guru/admin.
 * scope: 'individual' | 'team' | 'all'
 * individual: wajib user_id
 * team: wajib classroom_id (anggota kelas = tim)
 * all: hapus semua progres case (admin: global; guru: semua siswa di kelas mereka yang terpasang case ini)
 */
export function resetCaseProgress(payload) {
  return apiFetch('/api/progress/reset/', { method: 'POST', body: payload });
}
