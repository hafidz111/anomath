import { apiFetch } from './client';

/** GET /api/student/classes/public/ — kelas publik (setelah disetujui admin) */
export function fetchStudentPublicClasses() {
  return apiFetch('/api/student/classes/public/');
}

/** GET /api/student/classes/me/ — kelas yang sudah diikuti */
export function fetchMyClasses() {
  return apiFetch('/api/student/classes/me/');
}

/** POST /api/student/classes/join/ — body: { join_code } atau { class_id } (publik) */
export function joinStudentClass(payload) {
  return apiFetch('/api/student/classes/join/', { method: 'POST', body: payload });
}
