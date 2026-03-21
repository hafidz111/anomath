import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen,
  CheckCircle,
  CloudUpload,
  Eye,
  Lightbulb,
  Plus,
  Settings,
  Target,
  Trash2,
} from 'lucide-react';

import { TeacherTopBar } from '@/components/teacher/teacher-top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchMe } from '@/lib/api/auth';
import { fetchAdminClass, fetchAdminClasses, updateAdminClass } from '@/lib/api/admin';
import { createCase, getCase, listCases, updateCase } from '@/lib/api/cases';

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

const CASE_THEMES = [
  'from-blue-100 to-blue-50 border-blue-200',
  'from-purple-100 to-purple-50 border-purple-200',
  'from-yellow-100 to-yellow-50 border-yellow-200',
];

export default function CaseBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classCodeParam = searchParams.get('classCode') || '';
  const caseUuidParam = searchParams.get('caseUuid') || '';

  const [caseTitle, setCaseTitle] = useState('The Missing Numbers');
  const [difficulty, setDifficulty] = useState('Medium');
  const [stages, setStages] = useState(4);
  const [storyIntro, setStoryIntro] = useState(
    'Detective, we have a puzzling case. Numbers have vanished from the city accounting office.',
  );
  const [clueNarrative, setClueNarrative] = useState(
    'Each correct answer reveals a clue about the number thief.',
  );
  const [finalObjective, setFinalObjective] = useState(
    'Identify the culprit and recover the safe code.',
  );
  const [targetClass, setTargetClass] = useState('');
  const [classOptions, setClassOptions] = useState([]);
  const [myCasesPreview, setMyCasesPreview] = useState([]);
  const [caseLoaded, setCaseLoaded] = useState(!caseUuidParam);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAdminClasses({ page_size: 500 });
        const classes = data?.classes ?? [];
        if (!cancelled) {
          setClassOptions(
            classes.map((c) => ({
              id: String(c.id),
              name: c.name,
              code: buildClassCode(c),
            })),
          );
        }
      } catch {
        if (!cancelled) setClassOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!classCodeParam || !classOptions.length) return;
    const found = classOptions.find(
      (c) => c.code === classCodeParam || c.id === classCodeParam,
    );
    if (found) setTargetClass(found.id);
  }, [classCodeParam, classOptions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        const casesData = await listCases({ page_size: 200 });
        const mine = (casesData?.cases ?? []).filter(
          (c) => String(c.created_by) === String(me.id),
        );
        if (!cancelled) setMyCasesPreview(mine.slice(0, 8));
      } catch {
        if (!cancelled) setMyCasesPreview([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!caseUuidParam) {
      setCaseLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const c = await getCase(caseUuidParam);
        if (cancelled || !c) return;
        setCaseTitle(c.title || '');
        const desc = String(c.description || '');
        const parts = desc.split(/\n\n+/);
        setStoryIntro(parts[0] || '');
        setClueNarrative(parts[1] || '');
        setFinalObjective(parts.slice(2).join('\n\n') || '');
        setDifficulty(
          String(c.difficulty || 'medium').replace(/^\w/, (ch) => ch.toUpperCase()),
        );
      } catch {
        if (!cancelled) toast.error('Gagal memuat case untuk edit.');
      } finally {
        if (!cancelled) setCaseLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseUuidParam]);

  const checks = [
    { label: 'Judul case', ok: caseTitle.trim().length >= 5 },
    { label: 'Cerita pembuka', ok: storyIntro.trim().length >= 20 },
    { label: 'Tujuan akhir', ok: finalObjective.trim().length >= 12 },
    { label: 'Minimum 3 tahap (rencana)', ok: stages >= 3 },
  ];
  const classAttachOk =
    Boolean(classCodeParam) ||
    Boolean(targetClass) ||
    Boolean(caseUuidParam);
  const classCheckLabel = caseUuidParam
    ? 'Mode edit (kelas tidak perlu dipilih ulang)'
    : classCodeParam
      ? 'Kelas dari URL (akan ditautkan saat simpan)'
      : 'Kelas dipilih untuk menautkan case';
  const readyToPublish =
    checks.every((item) => item.ok) && classAttachOk;

  /**
   * Setelah POST case baru: tautkan ke kelas (M2M) lewat PATCH admin class dengan `case_ids` lengkap.
   * @returns {boolean} true jika terpasang ke minimal satu kelas
   */
  async function attachCaseToClassroom(caseId) {
    const mergeIds = async (classId) => {
      const detail = await fetchAdminClass(classId);
      const existingIds = (detail?.cases ?? []).map((c) => c.id);
      if (existingIds.includes(caseId)) return;
      await updateAdminClass(classId, { case_ids: [...existingIds, caseId] });
    };

    if (classCodeParam) {
      const data = await fetchAdminClasses({ page_size: 500 });
      const classes = data?.classes ?? [];
      const found = classes.find(
        (c) =>
          buildClassCode(c) === classCodeParam || String(c.id) === classCodeParam,
      );
      if (found) {
        await mergeIds(found.id);
        return true;
      }
      toast.warning(
        'Case dibuat, tetapi kelas dari URL tidak ditemukan. Pasang case dari menu detail kelas.',
      );
      return false;
    }
    if (targetClass) {
      await mergeIds(targetClass);
      return true;
    }
    return false;
  }

  const handlePublishToServer = async () => {
    const diff = difficulty.toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(diff)) {
      toast.error('Pilih tingkat kesulitan (Easy/Medium/Hard).');
      return;
    }
    const description = [storyIntro, clueNarrative, finalObjective].join('\n\n').trim();
    if (caseTitle.trim().length < 3 || description.length < 10) {
      toast.error('Judul dan deskripsi terlalu pendek.');
      return;
    }
    if (!classCodeParam && !targetClass && !caseUuidParam) {
      toast.error('Pilih kelas tujuan atau buka Case Builder dari detail kelas (ada kode kelas di URL).');
      return;
    }
    const loadingId = toast.loading('Menyimpan case ke server…');
    try {
      let data;
      if (caseUuidParam) {
        data = await updateCase(caseUuidParam, {
          title: caseTitle.trim(),
          description,
          difficulty: diff,
        });
      } else {
        data = await createCase({
          title: caseTitle.trim(),
          description,
          difficulty: diff,
        });
        const attached = await attachCaseToClassroom(data.id);
        toast.dismiss(loadingId);
        if (attached) {
          toast.success('Case dibuat dan terpasang ke kelas. Lanjut ke puzzle.');
        } else {
          toast.success(
            'Case dibuat. Tautkan ke kelas dari detail kelas bila perlu, lalu tambahkan puzzle.',
          );
        }
        const q = new URLSearchParams();
        q.set('caseUuid', data.id);
        if (classCodeParam) q.set('classCode', classCodeParam);
        navigate(`/teacher/puzzle-builder?${q.toString()}`);
        return;
      }
      toast.dismiss(loadingId);
      toast.success('Case diperbarui.');
      const q = new URLSearchParams();
      q.set('caseUuid', data.id);
      if (classCodeParam) q.set('classCode', classCodeParam);
      navigate(`/teacher/puzzle-builder?${q.toString()}`);
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    }
  };

  const backTo = classCodeParam
    ? `/teacher/classes/${encodeURIComponent(classCodeParam)}`
    : '/teacher';
  const backLabel = classCodeParam ? 'Detail kelas' : 'Dashboard';

  const puzzleBuilderHref = useMemo(() => {
    const q = new URLSearchParams();
    if (caseUuidParam) q.set('caseUuid', caseUuidParam);
    if (classCodeParam) q.set('classCode', classCodeParam);
    const s = q.toString();
    return s ? `/teacher/puzzle-builder?${s}` : '/teacher/puzzle-builder';
  }, [caseUuidParam, classCodeParam]);

  if (!caseLoaded) {
    return (
      <div className='min-h-screen bg-white'>
        <TeacherTopBar title='Case Builder' showBackTo={backTo} backLabel={backLabel} />
        <div className='mx-auto max-w-3xl px-4 py-16 text-center text-gray-600'>
          Memuat case…
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-white'>
      <TeacherTopBar
        title='Case Builder'
        showBackTo={backTo}
        backLabel={backLabel}
        actionsRight={
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Button variant='outline' className='rounded-full' size='sm' type='button'>
              <Eye className='mr-2 h-4 w-4' />
              Preview
            </Button>
            <Button
              onClick={handlePublishToServer}
              disabled={!readyToPublish}
              className='rounded-full bg-linear-to-r from-green-200 to-emerald-200 text-emerald-800 disabled:opacity-50'
              size='sm'
              type='button'
            >
              <CloudUpload className='mr-2 h-4 w-4' />
              {caseUuidParam ? 'Simpan perubahan' : 'Simpan Case'}
            </Button>
          </div>
        }
      />

      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <Card className='rounded-2xl border border-purple-200 bg-linear-to-r from-purple-50 to-blue-50 mb-6'>
          <CardContent className='p-4'>
            <div className='grid sm:grid-cols-5 gap-3 text-sm'>
              {['Case Info', 'Story', 'Puzzles', 'Validation', 'Publish'].map((step, index) => (
                <div key={step} className='bg-white rounded-lg border border-gray-200 px-3 py-2 text-gray-700 font-medium'>
                  {index + 1}. {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className='grid lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2 space-y-6'>
            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-8 space-y-6'>
                <h2 className='text-2xl font-bold text-gray-900'>Case Details</h2>
                <div className='space-y-2'>
                  <Label>Case Title</Label>
                  <Input value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} className='bg-gray-50' />
                </div>
                <p className='text-xs text-gray-500'>
                  Deskripsi penuh di server = cerita pembuka + narasi clue + tujuan akhir (bagian Story di bawah).
                </p>
                <div className='grid sm:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className='bg-gray-50'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='Easy'>Easy</SelectItem>
                        <SelectItem value='Medium'>Medium</SelectItem>
                        <SelectItem value='Hard'>Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label>Number of Stages</Label>
                    <Input type='number' value={stages} onChange={(e) => setStages(Number(e.target.value || 1))} className='bg-gray-50' />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-blue-200 bg-linear-to-br from-blue-100 to-purple-100 shadow-sm'>
              <CardContent className='p-8 space-y-4'>
                <div className='flex items-center gap-3'>
                  <div className='w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm'>
                    <BookOpen className='w-6 h-6 text-blue-600' />
                  </div>
                  <h2 className='text-2xl font-bold text-gray-900'>Story and Context</h2>
                </div>
                <textarea
                  rows={5}
                  className='w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 resize-none'
                  value={storyIntro}
                  onChange={(e) => setStoryIntro(e.target.value)}
                />
                <textarea
                  rows={3}
                  className='w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 resize-none'
                  value={clueNarrative}
                  onChange={(e) => setClueNarrative(e.target.value)}
                />
                <div className='space-y-2'>
                  <Label>Final Objective</Label>
                  <Input
                    value={finalObjective}
                    onChange={(e) => setFinalObjective(e.target.value)}
                    className='bg-white'
                    placeholder='Example: identify culprit and unlock safe code'
                  />
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-8'>
                <div className='flex items-center justify-between mb-6'>
                  <div className='flex items-center gap-3'>
                    <div className='w-12 h-12 rounded-xl bg-linear-to-br from-purple-200 to-blue-200 flex items-center justify-center shadow-sm'>
                      <Target className='w-6 h-6 text-purple-600' />
                    </div>
                    <h2 className='text-2xl font-bold text-gray-900'>Math Puzzles</h2>
                  </div>
                  {caseUuidParam ? (
                    <Button
                      asChild
                      className='bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 rounded-full'
                    >
                      <Link to={puzzleBuilderHref}>
                        <Plus className='w-4 h-4 mr-2' />
                        Tambah puzzle
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type='button'
                      disabled
                      className='rounded-full'
                      variant='secondary'
                      title='Simpan case dulu agar punya ID case'
                    >
                      <Plus className='w-4 h-4 mr-2' />
                      Tambah puzzle
                    </Button>
                  )}
                </div>

                <div className='space-y-3'>
                  {[...Array(stages)].map((_, idx) => {
                    const stage = idx + 1;
                    return (
                      <div key={stage} className='flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-sm transition-all'>
                        <div className='flex items-center gap-4'>
                          <div className='w-10 h-10 rounded-lg bg-linear-to-br from-purple-200 to-blue-200 flex items-center justify-center font-bold text-purple-700'>
                            {stage}
                          </div>
                          <div>
                            <p className='font-semibold text-gray-900'>Stage {stage} Puzzle</p>
                            <p className='text-sm text-gray-600'>Equation solving - 50 points</p>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Button size='icon' variant='ghost'><Settings className='w-5 h-5' /></Button>
                          <Button size='icon' variant='ghost' className='text-red-600 hover:text-red-700'><Trash2 className='w-5 h-5' /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className='text-xs text-gray-500 mt-3'>
                  Detail soal & jawaban diatur di Puzzle Builder setelah case disimpan (tombol di atas atau alur simpan
                  case).
                </p>
              </CardContent>
            </Card>
          </div>

          <div className='space-y-6'>
            <Card className='rounded-3xl border border-yellow-200 bg-linear-to-br from-yellow-100 to-pink-100 shadow-sm'>
              <CardContent className='p-6'>
                <div className='inline-flex items-center gap-2 mb-4'>
                  <Lightbulb className='w-6 h-6 text-yellow-600' />
                  <h3 className='text-lg font-bold text-gray-900'>Design Tips</h3>
                </div>
                <div className='space-y-2 text-sm text-gray-700'>
                  <p>- Start with an engaging story hook</p>
                  <p>- Increase difficulty gradually</p>
                  <p>- Provide helpful hints</p>
                  <p>- Include a satisfying conclusion</p>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-4'>Case Anda (server)</h3>
                <div className='space-y-3'>
                  {myCasesPreview.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-4 bg-linear-to-br rounded-xl border ${CASE_THEMES[idx % CASE_THEMES.length]}`}
                    >
                      <p className='font-semibold text-gray-900 mb-1'>{item.title}</p>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-gray-600'>{item.difficulty}</span>
                        <Button variant='ghost' size='sm' className='h-7 text-xs' asChild>
                          <Link to={`/teacher/puzzle-builder?caseUuid=${item.id}`}>Puzzle</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {myCasesPreview.length === 0 ? (
                    <p className='text-sm text-gray-500'>Belum ada case di akun ini.</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100 shadow-sm'>
              <CardContent className='p-6 text-sm'>
                <h3 className='text-lg font-bold text-gray-900 mb-3'>Case Summary</h3>
                <div className='space-y-2'>
                  <div className='flex justify-between'><span className='text-gray-600'>Total Stages:</span><span className='font-bold text-gray-900'>{stages}</span></div>
                  <div className='flex justify-between'><span className='text-gray-600'>Difficulty:</span><span className='font-bold text-gray-900'>{difficulty}</span></div>
                  <div className='flex justify-between'><span className='text-gray-600'>Total Points:</span><span className='font-bold text-gray-900'>250</span></div>
                  <div className='flex justify-between'><span className='text-gray-600'>Est. Time:</span><span className='font-bold text-gray-900'>30 min</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-3'>Puzzle &amp; clue</h3>
                <p className='text-sm text-gray-600'>
                  Setelah menyimpan case, Anda diarahkan ke Puzzle Builder untuk menambahkan soal, jawaban, dan urutan.
                  Tombol <span className='font-medium'>Tambah puzzle</span> aktif jika URL memuat{' '}
                  <span className='font-mono text-xs'>caseUuid</span> (misalnya setelah simpan atau dari menu edit).
                </p>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-3'>Publish Readiness</h3>
                <div className='space-y-2 mb-4'>
                  <Label>Kelas (untuk menautkan case)</Label>
                  {classCodeParam ? (
                    <p className='rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900'>
                      Dari detail kelas: <span className='font-mono font-semibold'>{classCodeParam}</span>
                    </p>
                  ) : (
                    <Select value={targetClass} onValueChange={setTargetClass}>
                      <SelectTrigger className='bg-gray-50'>
                        <SelectValue placeholder='Pilih kelas' />
                      </SelectTrigger>
                      <SelectContent>
                        {classOptions.map((classItem) => (
                          <SelectItem key={classItem.id} value={classItem.id}>
                            {classItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className='space-y-2 mb-4'>
                  {checks.map((item) => (
                    <div key={item.label} className='flex items-center gap-2 text-sm'>
                      <CheckCircle className={`w-4 h-4 ${item.ok ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className={item.ok ? 'text-gray-800' : 'text-gray-500'}>{item.label}</span>
                    </div>
                  ))}
                  <div className='flex items-center gap-2 text-sm'>
                    <CheckCircle className={`w-4 h-4 ${classAttachOk ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={classAttachOk ? 'text-gray-800' : 'text-gray-500'}>
                      {classCheckLabel}
                    </span>
                  </div>
                </div>
                <Button
                  type='button'
                  disabled={!readyToPublish}
                  onClick={handlePublishToServer}
                  className='w-full bg-linear-to-r from-purple-300 to-blue-300 text-purple-700 disabled:opacity-50'
                >
                  {caseUuidParam ? 'Simpan perubahan' : 'Simpan case & lanjut puzzle'}
                </Button>
                {!readyToPublish ? (
                  <p className='text-xs text-gray-500 mt-2'>
                    Isi judul, cerita, tujuan, dan minimal 3 tahap; pilih kelas jika tidak dari URL kelas.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
