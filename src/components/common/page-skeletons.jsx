import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

/** Baris tabel generik untuk state loading daftar admin. */
export function TableSkeletonRows({ rows = 6, columns = 8 }) {
  return Array.from({ length: rows }, (_, r) => (
    <TableRow key={r}>
      {Array.from({ length: columns }, (_, c) => (
        <TableCell key={c} className='align-middle'>
          <Skeleton className='h-4 w-full min-w-[3rem] max-w-[140px]' />
        </TableCell>
      ))}
    </TableRow>
  ));
}

/** Panel samping admin saat memuat detail / form. */
export function AsidePanelSkeleton({ fields = 8 }) {
  return (
    <div className='space-y-4 py-2' aria-hidden>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className='space-y-2'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-5 w-full' />
        </div>
      ))}
      <Skeleton className='h-24 w-full rounded-xl' />
    </div>
  );
}

export function LeaderboardPageSkeleton() {
  return (
    <div className='space-y-6' aria-busy='true' aria-label='Memuat leaderboard'>
      <div className='flex flex-wrap gap-2'>
        <Skeleton className='h-10 w-44 rounded-md' />
        <Skeleton className='h-10 w-44 rounded-md' />
        <Skeleton className='h-10 w-40 rounded-md' />
      </div>
      <Skeleton className='h-20 w-full max-w-3xl rounded-xl' />
      <div className='grid gap-6 md:grid-cols-3'>
        <Skeleton className='h-44 rounded-3xl md:mt-6' />
        <Skeleton className='h-52 rounded-3xl' />
        <Skeleton className='h-44 rounded-3xl md:mt-6' />
      </div>
      <Skeleton className='h-64 w-full rounded-2xl' />
    </div>
  );
}

export function StudentDashboardSkeleton() {
  return (
    <div className='min-h-screen bg-white' aria-busy='true' aria-label='Memuat dashboard'>
      <nav className='sticky top-0 z-50 border-b border-gray-200 bg-white'>
        <div className='mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8'>
          <Skeleton className='h-8 w-36' />
          <div className='ml-auto flex items-center gap-3'>
            <Skeleton className='hidden h-9 w-28 sm:block' />
            <Skeleton className='h-9 w-9 rounded-full' />
          </div>
        </div>
      </nav>
      <div className='mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8'>
        <Skeleton className='h-10 w-full max-w-md' />
        <div className='grid gap-4 lg:grid-cols-2'>
          <Skeleton className='h-32 rounded-2xl' />
          <Skeleton className='h-32 rounded-2xl' />
        </div>
        <Skeleton className='h-48 rounded-3xl' />
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-36 rounded-2xl' />
          ))}
        </div>
        <div className='grid gap-8 lg:grid-cols-3'>
          <div className='space-y-6 lg:col-span-2'>
            <Skeleton className='h-8 w-40' />
            <Skeleton className='h-44 rounded-3xl' />
            <Skeleton className='h-8 w-32' />
            <div className='grid gap-4 sm:grid-cols-2'>
              <Skeleton className='h-28 rounded-2xl' />
              <Skeleton className='h-28 rounded-2xl' />
            </div>
          </div>
          <Skeleton className='h-72 rounded-2xl' />
        </div>
      </div>
    </div>
  );
}

/**
 * Kerangka halaman alur case siswa (nav 3 kolom + konten).
 * @param {string} shellClassName — kelas pada wrapper luar (background).
 * @param {string} innerMax — max-width konten (mis. max-w-5xl, max-w-4xl).
 */
export function CaseFlowPageSkeleton({
  shellClassName = 'min-h-screen bg-white',
  innerMax = 'max-w-5xl',
}) {
  return (
    <div className={shellClassName} aria-busy='true' aria-label='Memuat halaman'>
      <nav className='sticky top-0 z-50 border-b border-gray-200 bg-white'>
        <div
          className={`mx-auto grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-6 lg:px-8 ${innerMax}`}
        >
          <Skeleton className='h-8 w-16 justify-self-start' />
          <Skeleton className='h-8 w-28 justify-self-center' />
          <Skeleton className='h-9 w-9 justify-self-end rounded-full' />
        </div>
      </nav>
      <div className={`mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8 ${innerMax}`}>
        <Card className='rounded-3xl border border-gray-200'>
          <CardContent className='space-y-3 p-6'>
            <Skeleton className='h-8 w-2/3 max-w-sm' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-5/6' />
            <Skeleton className='h-4 w-3/4' />
          </CardContent>
        </Card>
        <Skeleton className='h-36 w-full rounded-2xl' />
      </div>
    </div>
  );
}

/** Isi form Case Builder (pakai bersama `TeacherTopBar` di halaman). */
export function CaseBuilderFormSkeleton() {
  return (
    <div
      className='mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'
      aria-busy='true'
      aria-label='Memuat case builder'
    >
      <Skeleton className='h-24 w-full rounded-2xl' />
      <div className='grid gap-8 lg:grid-cols-3'>
        <div className='space-y-4 lg:col-span-2'>
          <Skeleton className='h-64 w-full rounded-3xl' />
          <Skeleton className='h-48 w-full rounded-3xl' />
        </div>
        <Skeleton className='h-96 rounded-3xl' />
      </div>
    </div>
  );
}

export function ClassListPageSkeleton({ rows = 5 }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-24 w-full rounded-xl' />
      ))}
    </div>
  );
}

export function PuzzleListSkeleton({ items = 4 }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className='h-20 w-full rounded-xl' />
      ))}
    </div>
  );
}

export function AdminCaseGridSkeleton({ cards = 6 }) {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className='h-72 rounded-3xl' />
      ))}
    </div>
  );
}

export function StatCardsRowSkeleton({ count = 4 }) {
  return (
    <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className='h-28 rounded-2xl' />
      ))}
    </div>
  );
}
