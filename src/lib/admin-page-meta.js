/** Judul bar atas Admin (sejajar tombol Keluar). */
export function getAdminPageTitle(pathname) {
  const p = pathname || '';
  if (p === '/admin' || p === '/admin/') return 'Dashboard';
  if (p.startsWith('/admin/users')) return 'Pengguna';
  if (p.startsWith('/admin/classes')) return 'Kelas';
  if (p.startsWith('/admin/class-review')) return 'Review kelas publik';
  if (p.startsWith('/admin/cases')) return 'Cases';
  if (p.startsWith('/admin/puzzles')) return 'Puzzle';
  if (p.startsWith('/admin/leaderboard')) return 'Leaderboard';
  if (p.startsWith('/admin/settings')) return 'Pengaturan';
  return 'Admin';
}
