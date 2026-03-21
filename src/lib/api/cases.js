import { apiFetch } from './client';

/** GET /api/cases/ */
export function listCases(params = {}) {
  const q = new URLSearchParams();
  if (params.title) q.set('title', params.title);
  if (params.code) q.set('code', String(params.code));
  if (params.class_id) q.set('class_id', String(params.class_id));
  if (params.page) q.set('page', String(params.page));
  if (params.page_size) q.set('page_size', String(params.page_size));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return apiFetch(`/api/cases/${suffix}`);
}

/** GET /api/cases/:id/ */
export function getCase(caseId) {
  return apiFetch(`/api/cases/${caseId}/`);
}

/** POST /api/cases/ — teacher/admin */
export function createCase(payload) {
  return apiFetch('/api/cases/', { method: 'POST', body: payload });
}

/** PUT /api/cases/:id/ */
export function updateCase(caseId, payload) {
  return apiFetch(`/api/cases/${caseId}/`, { method: 'PUT', body: payload });
}

/** DELETE /api/cases/:id/ — soft delete */
export function deleteCase(caseId) {
  return apiFetch(`/api/cases/${caseId}/`, { method: 'DELETE' });
}

/** GET /api/cases/:id/puzzles/ */
export function listPuzzles(caseId) {
  return apiFetch(`/api/cases/${caseId}/puzzles/`);
}

/** POST /api/cases/:id/puzzles/ — teacher/admin */
export function createPuzzle(caseId, payload) {
  return apiFetch(`/api/cases/${caseId}/puzzles/`, { method: 'POST', body: payload });
}

/** POST /api/puzzles/:puzzleId/submit/ */
export function submitPuzzleAnswer(puzzleId, answer) {
  return apiFetch(`/api/puzzles/${puzzleId}/submit/`, {
    method: 'POST',
    body: { answer },
  });
}


/** POST /api/cases/:caseId/final-deduction/ */
export function submitFinalDeduction(caseId, payload) {
  return apiFetch(`/api/cases/${caseId}/final-deduction/`, { method: 'POST', body: payload });
}
