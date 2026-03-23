import { apiFetch } from './client';

/** Normalisasi array puzzle dari `case.puzzles` atau bentuk legacy. */
export function normalizePuzzleListPayload(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'object') return [];
  if (Array.isArray(payload.puzzles)) return payload.puzzles;
  if (Array.isArray(payload.puzzle_set)) return payload.puzzle_set;
  if (Array.isArray(payload.case_puzzles)) return payload.case_puzzles;
  if (Array.isArray(payload.puzzle_items)) return payload.puzzle_items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * Kumpulkan array puzzle dari objek case (GET /api/cases/:id/) — beberapa backend
 * tidak mengisi `puzzles` tetapi memakai nama relasi lain.
 */
export function extractPuzzlesFromCase(caseObj) {
  if (!caseObj || typeof caseObj !== 'object') return [];
  const candidates = [
    caseObj.puzzles,
    caseObj.puzzle_set,
    caseObj.case_puzzles,
    caseObj.puzzle_items,
  ];
  for (const c of candidates) {
    const arr = normalizePuzzleListPayload(c);
    if (Array.isArray(arr) && arr.length > 0) return arr;
  }
  return normalizePuzzleListPayload(caseObj.puzzles);
}

/** Unwrap puzzle dari respons POST/PUT (dengan/tanpa envelope `data`). */
export function normalizePuzzleSaveResponse(res) {
  if (res == null || typeof res !== 'object') return null;
  const inner =
    res.data != null && typeof res.data === 'object' ? res.data : res;
  return inner?.id != null ? inner : null;
}

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

/** Urutan puzzle seperti di Case Builder / backend (`order` numerik). */
export function sortPuzzlesByOrder(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const oa = Number(a?.order);
    const ob = Number(b?.order);
    if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob;
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

/** Nilai `order` puzzle pertama (untuk URL ?stage=), fallback 1. */
export function getFirstPuzzleOrder(sortedList) {
  const o = Number(sortedList?.[0]?.order);
  return Number.isFinite(o) ? o : 1;
}

/**
 * Cocokkan ?stage= dengan `puzzle.order`, lalu fallback indeks 1-based di daftar terurut.
 */
export function findPuzzleByStage(sortedList, stageRaw) {
  const s = Number(stageRaw);
  if (!sortedList.length) return null;
  if (Number.isFinite(s)) {
    const byOrder = sortedList.find((p) => Number(p.order) === s);
    if (byOrder) return byOrder;
    if (s >= 1 && s <= sortedList.length) return sortedList[s - 1];
  }
  return sortedList[0];
}

/** Pastikan objek case punya `puzzles` (array) — sumber utama daftar soal dalam case. */
export function normalizeCaseDetail(payload) {
  if (payload == null || typeof payload !== 'object') return payload;
  const next = { ...payload };
  if (!Array.isArray(next.puzzles)) next.puzzles = [];
  if (next.builder_meta != null && typeof next.builder_meta !== 'object') {
    next.builder_meta = {};
  }
  if (typeof next.builder_step !== 'string' || !next.builder_step.trim()) {
    next.builder_step = 'info';
  }
  return next;
}

/** GET /api/cases/:id/ — termasuk `puzzles[]` di dalam body case (bukan resource terpisah). */
export function getCase(caseId) {
  return apiFetch(`/api/cases/${caseId}/`).then(normalizeCaseDetail);
}

/** POST /api/cases/ — teacher/admin; body boleh berisi `puzzles: [{ question, answer, ... }]` */
export function createCase(payload) {
  return apiFetch('/api/cases/', { method: 'POST', body: payload }).then(normalizeCaseDetail);
}

/** PUT /api/cases/:id/ — boleh menyertakan `puzzles` untuk upsert (ada `id` = ubah, tanpa `id` = baru) */
export function updateCase(caseId, payload) {
  return apiFetch(`/api/cases/${caseId}/`, { method: 'PUT', body: payload }).then(normalizeCaseDetail);
}

/**
 * ID untuk GET/PUT/DELETE `/api/cases/:id/` dari objek case di response API (termasuk nested `case`).
 * Prioritas: uuid / case_uuid / case_id string → id string (UUID) → id numerik.
 */
export function getCaseRecordApiId(record) {
  if (record == null) return '';
  if (typeof record === 'string' || typeof record === 'number') {
    const s = String(record).trim();
    return s;
  }
  if (typeof record !== 'object') return '';
  const nested =
    record.case != null && typeof record.case === 'object'
      ? record.case
      : null;
  const tryPick = (o) => {
    if (!o || typeof o !== 'object') return '';
    if (typeof o.uuid === 'string' && o.uuid.trim()) return o.uuid.trim();
    if (typeof o.case_uuid === 'string' && o.case_uuid.trim())
      return o.case_uuid.trim();
    if (typeof o.case_id === 'string' && o.case_id.trim())
      return o.case_id.trim();
    if (typeof o.id === 'string' && o.id.includes('-')) return o.id.trim();
    if (typeof o.case_id === 'number' && Number.isFinite(o.case_id))
      return String(o.case_id);
    if (o.id != null && o.id !== '') return String(o.id).trim();
    return '';
  };
  return tryPick(nested) || tryPick(record);
}

/** DELETE /api/cases/:id/ — soft delete */
export function deleteCase(caseId) {
  const id = getCaseRecordApiId(caseId);
  if (!id) {
    return Promise.reject(new Error('ID case tidak valid.'));
  }
  return apiFetch(`/api/cases/${encodeURIComponent(id)}/`, {
    method: 'DELETE',
  });
}

/**
 * Daftar puzzle = satu GET /api/cases/:id/ (field `puzzles` atau alias relasi).
 * Jangan memanggil bersamaan dengan `getCase(caseId)` untuk id yang sama — gabungkan
 * dari satu respons `getCase` + `extractPuzzlesFromCase(c)` agar hemat backend.
 */
export function listPuzzles(caseId) {
  return getCase(caseId).then((c) => ({
    puzzles: extractPuzzlesFromCase(c),
  }));
}

/** POST /api/cases/:id/puzzles/ — tambah satu puzzle (alur Case Builder / Puzzle Builder). */
export function createPuzzle(caseId, payload) {
  return apiFetch(`/api/cases/${caseId}/puzzles/`, { method: 'POST', body: payload });
}

/** GET /api/puzzles/:id/ — detail (guru: biasanya termasuk jawaban) */
export function getPuzzle(puzzleId) {
  return apiFetch(`/api/puzzles/${puzzleId}/`);
}

/** PUT /api/puzzles/:id/ — perbarui soal / jawaban / penjelasan */
export function updatePuzzle(puzzleId, payload) {
  return apiFetch(`/api/puzzles/${puzzleId}/`, { method: 'PUT', body: payload });
}

/** DELETE /api/puzzles/:id/ */
export function deletePuzzle(puzzleId) {
  return apiFetch(`/api/puzzles/${puzzleId}/`, { method: 'DELETE' });
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
