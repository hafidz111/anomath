import { apiFetch } from './client';

/** GET /api/teacher/dashboard/ — aggregated dashboard for authenticated teacher */
export function fetchTeacherDashboard() {
  return apiFetch('/api/teacher/dashboard/');
}
