import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { AnomathLogoMark } from '@/components/branding/anomath-logo';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Kiri: opsional tautan Dashboard, lalu tombol kembali atau ikon pencarian (halaman utama guru).
 * Kanan: tombol tambahan (opsional) lalu Keluar — sejajar judul.
 */
export function TeacherTopBar({
  title,
  showBackTo = null,
  backLabel = 'Kembali',
  /** Tampil di kiri sebelum tombol kembali (mis. dari detail kelas ke `/teacher`). */
  dashboardTo = null,
  dashboardLabel = 'Dashboard',
  className,
  actionsRight = null,
}) {
  return (
    <nav
      className={cn(
        'sticky top-0 z-40 border-b border-gray-200 bg-white',
        className,
      )}
    >
      <div className='mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8'>
        {dashboardTo ? (
          <Button
            variant='ghost'
            size='sm'
            className='-ml-1 shrink-0 px-2 text-sm font-medium text-purple-700 hover:text-purple-900'
            asChild
          >
            <Link to={dashboardTo} aria-label={dashboardLabel}>
              {dashboardLabel}
            </Link>
          </Button>
        ) : null}
        {showBackTo ? (
          <Button variant='ghost' size='sm' className='-ml-2 max-w-[min(100%,12rem)] shrink-0' asChild>
            <Link to={showBackTo} className='inline-flex min-w-0 items-center gap-1.5' aria-label={backLabel}>
              <ArrowLeft className='h-4 w-4 shrink-0' />
              <span className='hidden min-w-0 truncate text-sm font-medium text-gray-700 sm:inline'>
                {backLabel}
              </span>
            </Link>
          </Button>
        ) : (
          <AnomathLogoMark size='bar' decorative={false} className='shrink-0' />
        )}

        <h1 className='min-w-0 flex-1 truncate text-base font-bold text-gray-900 sm:text-lg'>{title}</h1>

        <div className='flex shrink-0 items-center gap-2'>
          {actionsRight}
          <LogoutButton
            className='rounded-full border-0 bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 hover:opacity-95'
            variant='ghost'
            size='sm'
          />
        </div>
      </div>
    </nav>
  );
}
