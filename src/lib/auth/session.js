/**
 * Sesi auth di browser (localStorage).
 * Role dinormalisasi ke lowercase agar cocok dengan API (student/teacher/admin).
 */

export function getStoredRole() {
  const raw = localStorage.getItem('anomath_role');
  if (!raw) return null;
  return String(raw).toLowerCase().trim();
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('anomath_access'));
}

/**
 * @param {string[]} allowedRoles contoh: ['student', 'teacher']
 */
export function hasRole(allowedRoles) {
  if (!allowedRoles?.length) return true;
  const role = getStoredRole();
  if (!role) return false;
  return allowedRoles.some((r) => String(r).toLowerCase() === role);
}

/** URL dashboard sesuai role saat ini, atau null */
export function getDashboardPathForRole(role = getStoredRole()) {
  if (!role) return null;
  switch (role) {
    case 'student':
      return '/student';
    case 'teacher':
      return '/teacher';
    case 'admin':
      return '/admin';
    default:
      return null;
  }
}
