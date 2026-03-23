import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Puzzle, Trash2, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';

import { TeacherTopBar } from '@/components/teacher/teacher-top-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  createCase,
  createPuzzle,
  deleteCase,
  getCaseRecordApiId,
  listPuzzles,
} from '@/lib/api/cases';
import { fetchAdminClass, fetchAdminClasses, updateAdminClass } from '@/lib/api/admin';
import { clearCaseBuilderDraftStorageForCaseUuid } from '@/lib/case-builder-draft-storage';
import { CaseProgressResetPanel } from '@/features/teacher/case-progress-reset-panel';

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
  const [teacherClassesList, setTeacherClassesList] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateSourceCase, setDuplicateSourceCase] = useState(null);
  const [duplicateTargetClassId, setDuplicateTargetClassId] = useState('');
  const [duplicateSubmitting, setDuplicateSubmitting] = useState(false);

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
        setTeacherClassesList(classes);
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

  const latestCaseId = classCases[0]
    ? getCaseRecordApiId(classCases[0])
    : '';
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

  async function handleDeleteCase(caseRecord) {
    if (!window.confirm('Hapus case ini?')) return;
    const caseId = getCaseRecordApiId(caseRecord);
    if (!caseId) {
      toast.error('ID case tidak dikenali. Coba muat ulang halaman.');
      return;
    }
    try {
      if (classDetail?.id) {
        const ids = (classDetail?.cases ?? [])
          .map((x) => getCaseRecordApiId(x))
          .filter(Boolean);
        if (ids.includes(caseId)) {
          await updateAdminClass(classDetail.id, {
            case_ids: ids.filter((x) => x !== caseId),
          });
        }
      }
      await deleteCase(caseId);
      clearCaseBuilderDraftStorageForCaseUuid(caseId);
      toast.success('Case dihapus');
      if (classDetail?.id) await reloadDetail(classDetail.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus case');
    }
  }

  const attachCaseToClassById = useCallback(async (targetClassId, caseId) => {
    const detail = await fetchAdminClass(targetClassId);
    const existingIds = (detail?.cases ?? [])
      .map((x) => getCaseRecordApiId(x))
      .filter(Boolean);
    const cid = String(caseId);
    if (existingIds.includes(cid)) return;
    await updateAdminClass(targetClassId, {
      case_ids: [...existingIds, cid],
    });
  }, []);

  function openDuplicateModal(c) {
    setDuplicateSourceCase(c);
    setDuplicateTargetClassId(
      classDetail?.id != null ? String(classDetail.id) : '',
    );
    setDuplicateModalOpen(true);
  }

  function onDuplicateDialogOpenChange(open) {
    setDuplicateModalOpen(open);
    if (!open) {
      setDuplicateSourceCase(null);
      setDuplicateSubmitting(false);
    }
  }

  async function confirmDuplicateCaseWithPuzzles() {
    const c = duplicateSourceCase;
    if (!c) return;
    if (!duplicateTargetClassId?.trim()) {
      toast.error('Pilih kelas tujuan.');
      return;
    }
    const sourceId = getCaseRecordApiId(c);
    if (!sourceId) {
      toast.error('ID case tidak dikenali.');
      return;
    }
    const targetName =
      teacherClassesList.find(
        (cls) => String(cls.id) === String(duplicateTargetClassId),
      )?.name?.trim() || 'kelas terpilih';

    setDuplicateSubmitting(true);
    const loadingId = toast.loading('Menduplikasi case…');
    try {
      const duplicated = await createCase({
        title: `${c.title} (Copy)`,
        description: c.description || 'Duplicated from existing case',
        difficulty: c.difficulty || 'easy',
        is_draft: Boolean(c.is_draft),
      });
      const puzzleRes = await listPuzzles(sourceId);
      const puzzles = puzzleRes?.puzzles ?? [];
      for (const p of puzzles) {
        await createPuzzle(duplicated.id, {
          question: p.question,
          answer: p.answer,
          explanation: p.explanation || '',
        });
      }
      try {
        await attachCaseToClassById(duplicateTargetClassId, duplicated.id);
      } catch {
        toast.warning(
          `Salinan dibuat tetapi gagal menaut ke ${targetName}. Pasangkan manual dari detail kelas.`,
          { duration: 6000 },
        );
        toast.dismiss(loadingId);
        setDuplicateSubmitting(false);
        setDuplicateModalOpen(false);
        setDuplicateSourceCase(null);
        if (classDetail?.id) await reloadDetail(classDetail.id);
        return;
      }
      toast.dismiss(loadingId);
      toast.success(`Case diduplikasi dan dipasang di “${targetName}”.`);
      setDuplicateModalOpen(false);
      setDuplicateSourceCase(null);
      if (classDetail?.id) await reloadDetail(classDetail.id);
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(e instanceof Error ? e.message : 'Gagal duplikasi');
    } finally {
      setDuplicateSubmitting(false);
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
        <div className='mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
          <div className='flex flex-wrap gap-2'>
            <Skeleton className='h-9 w-36' />
            <Skeleton className='h-9 w-36' />
          </div>
          <Card>
            <CardContent className='space-y-4 p-6'>
              <Skeleton className='h-7 w-56' />
              <div className='grid gap-3 sm:grid-cols-3'>
                <Skeleton className='h-20 rounded-xl' />
                <Skeleton className='h-20 rounded-xl' />
                <Skeleton className='h-20 rounded-xl' />
              </div>
              <Skeleton className='h-40 rounded-xl' />
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
                    ? `/teacher/case-builder?caseUuid=${latestCaseId}&classCode=${encodeURIComponent(classCode || '')}&step=puzzles`
                    : `/teacher/case-builder?classCode=${encodeURIComponent(classCode || '')}&step=puzzles`
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
            {classCases.map((c) => {
              const caseApiId = getCaseRecordApiId(c);
              const isDraft = Boolean(c.is_draft);
              return (
              <div
                key={caseApiId || c.title}
                className={`rounded-xl border p-3 ${
                  isDraft
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-gray-200'
                }`}
              >
                <div className='mb-2 flex flex-wrap items-center gap-2'>
                  <span className='font-semibold text-gray-900'>{c.title}</span>
                  {isDraft ? (
                    <Badge
                      variant='outline'
                      className='border-amber-400 bg-white text-amber-900'
                    >
                      Draft
                    </Badge>
                  ) : null}
                </div>
                <div className='mb-3 text-xs text-gray-600'>
                  {Array.isArray(c.puzzles)
                    ? `${c.puzzles.length} puzzle`
                    : null}
                  {c.difficulty ? ` · ${c.difficulty}` : ''}
                </div>
                <div className='flex flex-wrap gap-2'>
                  {caseApiId ? (
                    <Button size='sm' variant='outline' asChild>
                      <Link
                        to={`/teacher/case-builder?caseUuid=${encodeURIComponent(caseApiId)}&classCode=${encodeURIComponent(classCode || '')}`}
                      >
                        Edit Case
                      </Link>
                    </Button>
                  ) : (
                    <Button size='sm' variant='outline' disabled>
                      Edit Case
                    </Button>
                  )}
                  {caseApiId ? (
                    <Button size='sm' variant='outline' asChild>
                      <Link
                        to={`/teacher/case-builder?caseUuid=${encodeURIComponent(caseApiId)}&classCode=${encodeURIComponent(classCode || '')}&step=puzzles`}
                      >
                        Manage Puzzle
                      </Link>
                    </Button>
                  ) : (
                    <Button size='sm' variant='outline' disabled>
                      Manage Puzzle
                    </Button>
                  )}
                  <Button
                    size='sm'
                    variant='outline'
                    type='button'
                    onClick={() => openDuplicateModal(c)}
                  >
                    <Copy className='mr-1 h-4 w-4' />
                    Duplicate Case+Puzzle
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    type='button'
                    disabled={!caseApiId}
                    onClick={() => handleDeleteCase(c)}
                  >
                    <Trash2 className='mr-1 h-4 w-4' />
                    Delete
                  </Button>
                </div>
              </div>
              );
            })}
            {classCases.length === 0 ? (
              <p className='text-sm text-gray-500'>
                Belum ada case terpasang di kelas ini.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {classDetail?.id ? (
          <CaseProgressResetPanel
            cases={classCases}
            students={classDetail.students ?? []}
            classroomId={String(classDetail.id)}
            onSuccess={() => void reloadDetail(classDetail.id)}
          />
        ) : null}
      </div>

      <Dialog open={duplicateModalOpen} onOpenChange={onDuplicateDialogOpenChange}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Duplikasi case</DialogTitle>
            <DialogDescription>
              Pilih kelas tujuan. Salinan case beserta puzzle akan ditautkan ke
              kelas tersebut (bukan otomatis ke semua kelas).
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            {duplicateSourceCase ? (
              <p className='rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800'>
                <span className='font-medium'>Sumber:</span>{' '}
                {duplicateSourceCase.title}
              </p>
            ) : null}
            <div className='space-y-2'>
              <Label htmlFor='duplicate-target-class'>Kelas tujuan</Label>
              {teacherClassesList.length === 0 ? (
                <p className='text-sm text-amber-800'>
                  Tidak ada kelas. Buat kelas dulu di manajemen kelas.
                </p>
              ) : (
                <Select
                  value={duplicateTargetClassId}
                  onValueChange={setDuplicateTargetClassId}
                >
                  <SelectTrigger
                    id='duplicate-target-class'
                    className='w-full rounded-xl border-gray-200'
                  >
                    <SelectValue placeholder='Pilih kelas' />
                  </SelectTrigger>
                  <SelectContent position='popper' className='z-60'>
                    {teacherClassesList.map((cls) => {
                      const code = buildClassCode(cls);
                      const label = cls.join_code
                        ? `${cls.name} · ${cls.join_code}`
                        : String(cls.name || code);
                      return (
                        <SelectItem key={cls.id} value={String(cls.id)}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2'>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              disabled={duplicateSubmitting}
              onClick={() => onDuplicateDialogOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type='button'
              className='rounded-full bg-purple-600 text-white hover:bg-purple-700'
              disabled={
                duplicateSubmitting ||
                !duplicateTargetClassId ||
                teacherClassesList.length === 0
              }
              onClick={() => void confirmDuplicateCaseWithPuzzles()}
            >
              {duplicateSubmitting ? 'Memproses…' : 'Duplikasi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
