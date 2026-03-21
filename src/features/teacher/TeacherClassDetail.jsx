import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Puzzle, Trash2, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';

import { TeacherTopBar } from '@/components/teacher/teacher-top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  createCase,
  createPuzzle,
  deleteCase,
  listPuzzles,
} from '@/lib/api/cases';
import { fetchAdminClass, fetchAdminClasses, updateAdminClass } from '@/lib/api/admin';

function buildClassCode(c) {
  return (
    c.join_code ||
    c.code ||
    c.class_code ||
    `${String(c.name || '')
      .toUpperCase()
      .replaceAll(/\s+/g, '-')}-${c.id}`
  );
}

export default function TeacherClassDetail() {
  const navigate = useNavigate();
  const { classCode } = useParams();
  const [classDetail, setClassDetail] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reloadDetail = useCallback(async (classId) => {
    const detail = await fetchAdminClass(classId);
    setClassDetail(detail);
    return detail;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const classesData = await fetchAdminClasses({ page_size: 500 });
        const classes = classesData?.classes ?? [];
        const found = classes.find((c) => {
          const code = buildClassCode(c);
          return (
            String(code) === String(classCode) ||
            String(c.id) === String(classCode)
          );
        });
        if (cancelled) return;
        if (!found) {
          setClassDetail(null);
          return;
        }
        await reloadDetail(found.id);
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : 'Gagal memuat detail kelas',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classCode, reloadDetail]);

  const classCases = useMemo(() => classDetail?.cases ?? [], [classDetail]);

  const totalPuzzlesInClass = useMemo(
    () =>
      classCases.reduce(
        (sum, c) =>
          sum +
          (Array.isArray(c.puzzles) ? c.puzzles.length : (c.puzzle_count ?? 0)),
        0,
      ),
    [classCases],
  );

  const latestCaseId = classCases[0]?.id;
  const className = classDetail?.name?.trim() || 'Kelas Tanpa Nama';
  const studentCount = Number(classDetail?.student_count ?? 0);
  const avgScore = Number(classDetail?.average_score ?? 0);
  const workModeLabel =
    classDetail?.work_mode === 'group' ? 'Kelompok' : 'Individu';

  const studentPlayUrl = useMemo(() => {
    if (!classDetail?.join_code || typeof window === 'undefined') return '';
    return `${window.location.origin}/student?code=${encodeURIComponent(classDetail.join_code)}`;
  }, [classDetail?.join_code]);

  function copyCodeAndLink() {
    const code = classDetail?.join_code;
    if (!code || !studentPlayUrl) return;
    const line = `${code}  ${studentPlayUrl}`;
    navigator.clipboard
      .writeText(line)
      .then(() => toast.success('Disalin'))
      .catch(() => toast.error('Gagal menyalin'));
  }

  async function requestPublicListing() {
    if (!classDetail?.id) return;
    try {
      await updateAdminClass(classDetail.id, { listing_status: 'pending_public' });
      toast.success('Diajukan');
      await reloadDetail(classDetail.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengajukan');
    }
  }

  const listingStatus = classDetail?.listing_status || 'private';
  const listingLabel =
    listingStatus === 'public'
      ? 'Publik (siswa bisa lihat di daftar)'
      : listingStatus === 'pending_public'
        ? 'Menunggu review admin untuk tampil publik'
        : 'Privat (siswa gabung pakai kode)';

  async function handleDeleteCase(caseId) {
    if (!window.confirm('Hapus case ini?')) return;
    try {
      await deleteCase(caseId);
      toast.success('Case dihapus');
      if (classDetail?.id) await reloadDetail(classDetail.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus case');
    }
  }

  async function handleDuplicateCaseWithPuzzles(c) {
    try {
      const duplicated = await createCase({
        title: `${c.title} (Copy)`,
        description: c.description || 'Duplicated from existing case',
        difficulty: c.difficulty || 'easy',
      });
      const puzzleRes = await listPuzzles(c.id);
      const puzzles = puzzleRes?.puzzles ?? [];
      for (const p of puzzles) {
        await createPuzzle(duplicated.id, {
          question: p.question,
          answer: p.answer,
          explanation: p.explanation || '',
        });
      }
      toast.success('Case + puzzle berhasil diduplikasi');
      if (classDetail?.id) await reloadDetail(classDetail.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal duplikasi');
    }
  }

  const topBarProps = {
    showBackTo: '/teacher/classes',
    backLabel: 'Manajemen Kelas',
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-white'>
        <TeacherTopBar title='Detail Kelas' {...topBarProps} />
        <div className='mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8'>
          <Card>
            <CardContent className='space-y-2 p-6'>
              <p className='text-gray-700'>Memuat detail kelas...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!classDetail) {
    return (
      <div className='min-h-screen bg-white'>
        <TeacherTopBar title='Detail Kelas' {...topBarProps} />
        <div className='mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8'>
          <Card>
            <CardContent className='space-y-4 p-6'>
              <p className='text-gray-700'>Kelas tidak ditemukan.</p>
              <Button
                onClick={() => navigate('/teacher/classes')}
                type='button'
              >
                Kembali ke daftar kelas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-white'>
      <TeacherTopBar
        title={className}
        {...topBarProps}
        actionsRight={
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Button
              size='sm'
              type='button'
              className='bg-linear-to-r from-purple-200 to-blue-200 text-purple-700'
              asChild
            >
              <Link
                to={`/teacher/case-builder?classCode=${encodeURIComponent(classCode || '')}`}
              >
                Create New Case
              </Link>
            </Button>
            <Button
              size='sm'
              type='button'
              className='bg-linear-to-r from-pink-200 to-yellow-200 text-pink-700'
              asChild
            >
              <Link
                to={
                  latestCaseId
                    ? `/teacher/puzzle-builder?caseUuid=${latestCaseId}&classCode=${encodeURIComponent(classCode || '')}`
                    : `/teacher/puzzle-builder?classCode=${encodeURIComponent(classCode || '')}`
                }
              >
                Create New Puzzle
              </Link>
            </Button>
          </div>
        }
      />

      <div className='mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
        {loadError ? (
          <p className='text-sm text-amber-800' role='alert'>
            {loadError}
          </p>
        ) : null}

        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {[
            { label: 'Siswa', value: studentCount, icon: Users },
            { label: 'Skor Rata-rata', value: `${avgScore}%`, icon: Trophy },
            { label: 'Case', value: classCases.length, icon: Trophy },
            {
              label: 'Puzzle',
              value: totalPuzzlesInClass,
              icon: Puzzle,
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.label}
                className='rounded-2xl border border-gray-200'
              >
                <CardContent className='p-5'>
                  <Icon className='mb-2 h-5 w-5 text-purple-600' />
                  <div className='text-2xl font-bold text-gray-900'>
                    {s.value}
                  </div>
                  <p className='text-xs text-gray-600'>{s.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className='text-sm text-gray-600'>
          Mode pengerjaan:{' '}
          <span className='font-semibold text-gray-900'>{workModeLabel}</span>
        </p>

        <p className='text-sm text-gray-600'>
          Visibilitas: <span className='font-semibold text-gray-900'>{listingLabel}</span>
        </p>

        <Card className='rounded-2xl border border-indigo-200 bg-indigo-50/40'>
          <CardContent className='space-y-3 p-5'>
            <h2 className='text-lg font-bold text-gray-900'>Kode & tautan siswa</h2>
            {classDetail?.join_code && studentPlayUrl ? (
              <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
                <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-indigo-100'>
                  <span className='shrink-0 font-mono font-semibold tracking-wide text-gray-900'>
                    {classDetail.join_code}
                  </span>
                  <span className='text-gray-400'>·</span>
                  <span className='min-w-0 flex-1 truncate font-mono text-xs text-gray-700 sm:text-sm'>
                    {studentPlayUrl}
                  </span>
                </div>
                <Button
                  size='sm'
                  type='button'
                  variant='outline'
                  className='shrink-0 border-indigo-300'
                  onClick={copyCodeAndLink}
                >
                  <Copy className='mr-1 h-4 w-4' />
                  Salin
                </Button>
              </div>
            ) : null}
            {listingStatus === 'private' ? (
              <Button
                type='button'
                size='sm'
                variant='secondary'
                className='bg-white'
                onClick={requestPublicListing}
              >
                Ajukan publik
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className='rounded-2xl border border-gray-200'>
          <CardContent className='space-y-3 p-5'>
            <h2 className='text-lg font-bold text-gray-900'>
              Case di kelas ini
            </h2>
            {classCases.map((c) => (
              <div key={c.id} className='rounded-xl border border-gray-200 p-3'>
                <div className='mb-2 font-semibold text-gray-900'>
                  {c.title}
                </div>
                <div className='mb-3 text-xs text-gray-600'>
                  {Array.isArray(c.puzzles)
                    ? `${c.puzzles.length} puzzle`
                    : null}
                  {c.difficulty ? ` · ${c.difficulty}` : ''}
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button size='sm' variant='outline' asChild>
                    <Link
                      to={`/teacher/case-builder?caseUuid=${c.id}&classCode=${encodeURIComponent(classCode || '')}`}
                    >
                      Edit Case
                    </Link>
                  </Button>
                  <Button size='sm' variant='outline' asChild>
                    <Link
                      to={`/teacher/puzzle-builder?caseUuid=${c.id}&classCode=${encodeURIComponent(classCode || '')}`}
                    >
                      Manage Puzzle
                    </Link>
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    type='button'
                    onClick={() => handleDuplicateCaseWithPuzzles(c)}
                  >
                    <Copy className='mr-1 h-4 w-4' />
                    Duplicate Case+Puzzle
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    type='button'
                    onClick={() => handleDeleteCase(c.id)}
                  >
                    <Trash2 className='mr-1 h-4 w-4' />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {classCases.length === 0 ? (
              <p className='text-sm text-gray-500'>
                Belum ada case terpasang di kelas ini.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
