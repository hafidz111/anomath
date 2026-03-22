/** Versi payload draft di localStorage (Case Builder). */
export const CB_DRAFT_VERSION = 3;

const V2_PREFIX = 'anomath-case-builder-v2:';

function v3Prefix() {
  return `anomath-case-builder-v${CB_DRAFT_VERSION}:`;
}

/**
 * Kunci localStorage per kombinasi kelas + case (UUID API).
 * Tanpa UUID → slot "new" (draft case baru, belum punya id server).
 */
export function draftStorageKeys(classCode, caseUuid) {
  const slug = `${classCode || 'nocls'}:${caseUuid || 'new'}`;
  return {
    v3: `${v3Prefix()}${slug}`,
    v2: `${V2_PREFIX}${slug}`,
  };
}

/**
 * Hapus semua draft Case Builder untuk case ini (semua classCode),
 * dipanggil setelah case dihapus dari server.
 */
/**
 * Simpan draft wizard Case Builder ke localStorage (field form + metadata).
 * @returns {boolean} false jika gagal (quota / private mode).
 */
export function writeCaseBuilderDraft(classCode, caseUuid, fields) {
  if (typeof localStorage === 'undefined') return false;
  const { v3, v2 } = draftStorageKeys(classCode, caseUuid);
  const payload = { v: CB_DRAFT_VERSION, ...fields };
  try {
    localStorage.setItem(v3, JSON.stringify(payload));
    localStorage.removeItem(v2);
    return true;
  } catch {
    return false;
  }
}

export function clearCaseBuilderDraftStorageForCaseUuid(caseUuid) {
  if (typeof localStorage === 'undefined') return;
  const id = String(caseUuid || '').trim();
  if (!id || id === 'new') return;
  const p3 = v3Prefix();
  const suffix = `:${id}`;
  try {
    for (const key of Object.keys(localStorage)) {
      if (
        (key.startsWith(p3) && key.endsWith(suffix)) ||
        (key.startsWith(V2_PREFIX) && key.endsWith(suffix))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* quota / private mode */
  }
}
