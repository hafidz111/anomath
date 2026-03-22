import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TableSkeletonRows } from '@/components/common/page-skeletons';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAdminClasses, updateAdminClass } from '@/lib/api/admin';

export default function AdminClassPublicReview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actingId, setActingId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await fetchAdminClasses({ page_size: 500 });
      setRows(data?.classes ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat kelas');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleReload() {
    setLoading(true);
    refresh();
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pending = useMemo(
    () => rows.filter((r) => r.listing_status === 'pending_public'),
    [rows],
  );

  async function approve(id) {
    setActingId(id);
    try {
      await updateAdminClass(id, { listing_status: 'public' });
      toast.success('Disetujui');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setActingId(null);
    }
  }

  async function reject(id) {
    if (!window.confirm('Tolak?')) return;
    setActingId(id);
    try {
      await updateAdminClass(id, { listing_status: 'private' });
      toast.success('Ditolak');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <main className='mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <Skeleton className='h-7 w-56' />
          <Skeleton className='h-9 w-28' />
        </div>
        <Skeleton className='h-16 w-full max-w-md rounded-2xl' />
        <Card className='rounded-2xl border border-gray-200'>
          <CardContent className='p-4'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Guru</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeletonRows rows={5} columns={4} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className='mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-lg font-semibold text-gray-900'>Review kelas publik</h2>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='shrink-0'
          onClick={handleReload}
        >
          <RefreshCw className='mr-2 h-4 w-4' />
          Muat ulang
        </Button>
      </div>

      {loadError ? (
        <p className='text-sm text-red-600' role='alert'>
          {loadError}
        </p>
      ) : null}

      <Card className='rounded-2xl border border-amber-200 bg-amber-50/50'>
        <CardContent className='p-4'>
          <p className='text-sm text-amber-950'>
            Menunggu: <span className='font-semibold'>{pending.length}</span>
          </p>
        </CardContent>
      </Card>

      {pending.length === 0 ? (
        <Card className='rounded-2xl border border-gray-200'>
          <CardContent className='py-12 text-center'>
            <GraduationCap className='mx-auto mb-3 h-10 w-10 text-gray-400' />
            <p className='font-medium text-gray-900'>Kosong</p>
            <Button asChild variant='outline' className='mt-4 rounded-xl'>
              <Link to='/admin/classes'>Kelola semua kelas</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className='rounded-2xl border border-gray-200'>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Guru</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className='text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className='font-medium text-gray-900'>{r.name}</div>
                      <div className='text-xs text-gray-500'>Grade {r.grade ?? '—'}</div>
                    </TableCell>
                    <TableCell className='text-sm text-gray-700'>
                      {r.teacher_name || '—'}
                    </TableCell>
                    <TableCell>
                      <code className='rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs'>
                        {r.join_code || '—'}
                      </code>
                    </TableCell>
                    <TableCell className='text-sm'>
                      {r.work_mode === 'group' ? 'Kelompok' : 'Individu'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex flex-wrap justify-end gap-2'>
                        <Button
                          type='button'
                          size='sm'
                          className='bg-emerald-600 text-white hover:bg-emerald-700'
                          disabled={actingId === r.id}
                          onClick={() => approve(r.id)}
                        >
                          Setujui
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          disabled={actingId === r.id}
                          onClick={() => reject(r.id)}
                        >
                          Tolak
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
