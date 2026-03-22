import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AsidePanelSkeleton,
  StatCardsRowSkeleton,
  TableSkeletonRows,
} from '@/components/common/page-skeletons';
import {
  Eye,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createAdminClass,
  deleteAdminClass,
  fetchAdminCases,
  fetchAdminClass,
  fetchAdminClasses,
  fetchAdminUsers,
  updateAdminClass,
} from '@/lib/api/admin';
import { CaseProgressResetPanel } from '@/features/teacher/case-progress-reset-panel';

export default function AdminClassManagement() {
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [listLoading, setListLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState('detail');
  const [panelLoading, setPanelLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [teacherId, setTeacherId] = useState('none');
  const [studentCount, setStudentCount] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [workMode, setWorkMode] = useState('individual');
  const [listingStatus, setListingStatus] = useState('private');

  const refresh = useCallback(async () => {
    try {
      const [classData, userData, caseData] = await Promise.all([
        fetchAdminClasses({ page_size: 500 }),
        fetchAdminUsers({ page_size: 500 }),
        fetchAdminCases({ page_size: 500 }),
      ]);
      setRows(classData?.classes ?? []);
      setTeachers((userData?.users ?? []).filter((u) => u.role === 'teacher' || u.role === 'admin'));
      setCases((caseData?.cases ?? []).filter((c) => !c.is_deleted));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat kelas');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (pendingOnly) {
      list = list.filter((r) => r.listing_status === 'pending_public');
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const t = (r.teacher_name || '').toLowerCase();
      return r.name.toLowerCase().includes(q) || t.includes(q);
    });
  }, [rows, search, pendingOnly]);

  const summary = useMemo(() => ({
    total: rows.length,
    students: rows.reduce((sum, r) => sum + (r.student_count || 0), 0),
    cases: rows.reduce((sum, r) => sum + (r.case_count || 0), 0),
    puzzles: rows.reduce((sum, r) => sum + (r.puzzle_count || 0), 0),
  }), [rows]);

  const openCreate = () => {
    setPanelOpen(true);
    setPanelMode('create');
    setSelected(null);
    setName('');
    setGrade('');
    setTeacherId('none');
    setStudentCount(0);
    setAverageScore(0);
    setSelectedCaseIds([]);
    setWorkMode('individual');
    setListingStatus('private');
  };

  const openDetail = async (id, mode = 'detail') => {
    setPanelOpen(true);
    setPanelMode(mode);
    setPanelLoading(true);
    try {
      const data = await fetchAdminClass(id);
      setSelected(data);
      setName(data.name || '');
      setGrade(data.grade != null ? String(data.grade) : '');
      setTeacherId(data.teacher || 'none');
      setStudentCount(data.student_count || 0);
      setAverageScore(data.average_score || 0);
      setWorkMode(data.work_mode === 'group' ? 'group' : 'individual');
      setListingStatus(data.listing_status || 'private');
      setSelectedCaseIds((data.cases || []).map((c) => c.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat detail kelas');
      setPanelOpen(false);
    } finally {
      setPanelLoading(false);
    }
  };

  const save = async () => {
    const payload = {
      name: name.trim(),
      grade: grade ? Number(grade) : null,
      teacher_id: teacherId === 'none' ? null : teacherId,
      student_count: Number(studentCount || 0),
      average_score: Number(averageScore || 0),
      work_mode: workMode,
      listing_status: listingStatus,
      case_ids: selectedCaseIds,
    };
    try {
      if (panelMode === 'create') {
        await createAdminClass(payload);
        toast.success('Kelas dibuat');
      } else if (selected?.id) {
        await updateAdminClass(selected.id, payload);
        toast.success('Kelas diperbarui');
      }
      await refresh();
      setPanelOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan kelas');
    }
  };

  const removeClass = async (id) => {
    if (!window.confirm('Hapus kelas ini?')) return;
    try {
      await deleteAdminClass(id);
      toast.success('Kelas dihapus');
      await refresh();
      if (selected?.id === id) setPanelOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus kelas');
    }
  };

  return (
    <>
      <main className='mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
        {loadError ? <p className='text-sm text-red-600'>{loadError}</p> : null}

        {listLoading ? (
          <StatCardsRowSkeleton count={4} />
        ) : (
          <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
            {[
              { label: 'Total Classes', value: summary.total },
              { label: 'Total Students', value: summary.students },
              { label: 'Attached Cases', value: summary.cases },
              { label: 'Attached Puzzles', value: summary.puzzles },
            ].map((s) => (
              <Card key={s.label} className='rounded-2xl border bg-linear-to-br from-purple-50 to-blue-50'>
                <CardContent className='p-5'>
                  <div className='text-2xl font-bold text-gray-900'>{s.value}</div>
                  <p className='text-xs text-gray-600'>{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardContent className='space-y-4 p-4'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                <Input
                  className='pl-9'
                  placeholder='Search classes or teacher...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label className='flex cursor-pointer items-center gap-2 text-sm text-gray-700'>
                <input
                  type='checkbox'
                  checked={pendingOnly}
                  onChange={(e) => setPendingOnly(e.target.checked)}
                />
                Hanya pengajuan publik
              </label>
              <Button onClick={openCreate} className='bg-linear-to-r from-purple-200 to-blue-200 text-purple-700'>
                <Plus className='mr-2 h-4 w-4' />
                Create Class
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Cases/Puzzles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableSkeletonRows rows={8} columns={8} />
                ) : null}
                {!listLoading ? filteredRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className='inline-flex items-center gap-2'>
                        <GraduationCap className='h-4 w-4 text-purple-600' />
                        <div>
                          <div className='font-medium'>{r.name}</div>
                          <div className='text-xs text-gray-500'>Grade {r.grade ?? '-'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{r.teacher_name || '—'}</TableCell>
                    <TableCell className='text-sm text-gray-700'>
                      {r.work_mode === 'group' ? 'Kelompok' : 'Individu'}
                    </TableCell>
                    <TableCell className='text-sm'>
                      {r.listing_status === 'public'
                        ? 'Publik'
                        : r.listing_status === 'pending_public'
                          ? 'Menunggu review'
                          : 'Privat'}
                    </TableCell>
                    <TableCell>
                      <div className='inline-flex items-center gap-1'>
                        <Users className='h-4 w-4 text-gray-400' />
                        {r.student_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>{r.case_count || 0} / {r.puzzle_count || 0}</TableCell>
                    <TableCell>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className='text-right'>
                      <div className='inline-flex gap-2'>
                        <Button size='icon' variant='outline' onClick={() => openDetail(r.id, 'detail')}><Eye className='h-4 w-4' /></Button>
                        <Button size='icon' variant='outline' onClick={() => openDetail(r.id, 'edit')}><Pencil className='h-4 w-4' /></Button>
                        <Button size='icon' variant='outline' onClick={() => removeClass(r.id)}><Trash2 className='h-4 w-4' /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {panelOpen ? (
        <>
          <button className='fixed inset-0 z-40 bg-black/40' onClick={() => setPanelOpen(false)} />
          <aside className='fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-gray-200 bg-white p-4 overflow-y-auto'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-bold'>
                {panelMode === 'detail' ? 'Class Detail' : panelMode === 'create' ? 'Create Class' : 'Edit Class'}
              </h2>
              <Button variant='ghost' size='icon' onClick={() => setPanelOpen(false)}><X className='h-4 w-4' /></Button>
            </div>

            {panelLoading ? <AsidePanelSkeleton fields={8} /> : null}

            {!panelLoading && panelMode === 'detail' && selected ? (
              <div className='space-y-4'>
                <p><span className='font-semibold'>Name:</span> {selected.name}</p>
                <p><span className='font-semibold'>Teacher:</span> {selected.teacher_name || '—'}</p>
                <p><span className='font-semibold'>Student count:</span> {selected.student_count || 0}</p>
                <p><span className='font-semibold'>Average score:</span> {selected.average_score || 0}%</p>
                <p>
                  <span className='font-semibold'>Pengerjaan:</span>{' '}
                  {selected.work_mode === 'group' ? 'Kelompok' : 'Individu'}
                </p>
                <p>
                  <span className='font-semibold'>Kode gabung:</span>{' '}
                  <code className='rounded bg-gray-100 px-1 font-mono text-sm'>{selected.join_code || '—'}</code>
                </p>
                <p>
                  <span className='font-semibold'>Listing:</span>{' '}
                  {selected.listing_status === 'public'
                    ? 'Publik'
                    : selected.listing_status === 'pending_public'
                      ? 'Menunggu review'
                      : 'Privat'}
                </p>
                <div>
                  <p className='mb-2 font-semibold'>Cases and Puzzles</p>
                  <div className='space-y-3'>
                    {(selected.cases || []).map((c) => (
                      <Card key={c.id} className='border'>
                        <CardContent className='p-3'>
                          <div className='font-medium'>{c.title} <span className='text-xs text-gray-500'>({c.difficulty})</span></div>
                          <ul className='mt-2 space-y-1 text-sm text-gray-700'>
                            {(c.puzzles || []).map((p) => (
                              <li key={p.id}>#{p.order} {p.question}</li>
                            ))}
                            {(!c.puzzles || c.puzzles.length === 0) ? <li className='text-gray-500'>No puzzle</li> : null}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                    {(!selected.cases || selected.cases.length === 0) ? <p className='text-sm text-gray-500'>No case attached.</p> : null}
                  </div>
                </div>
                <CaseProgressResetPanel
                  cases={selected.cases || []}
                  students={selected.students || []}
                  classroomId={String(selected.id)}
                  onSuccess={() => void openDetail(selected.id, 'detail')}
                />
                <Button onClick={() => setPanelMode('edit')} className='w-full'>Edit</Button>
              </div>
            ) : null}

            {!panelLoading && panelMode !== 'detail' ? (
              <div className='space-y-3'>
                <div>
                  <Label>Class Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Grade</Label>
                  <Input type='number' value={grade} onChange={(e) => setGrade(e.target.value)} />
                </div>
                <div>
                  <Label>Mode pengerjaan</Label>
                  <Select value={workMode} onValueChange={setWorkMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='individual'>Individu</SelectItem>
                      <SelectItem value='group'>Kelompok</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='mt-1 text-xs text-gray-500'>
                    Individu: siswa mengerjakan sendiri. Kelompok: case dimaksudkan untuk tim.
                  </p>
                </div>
                <div>
                  <Label>Visibilitas daftar siswa</Label>
                  <Select value={listingStatus} onValueChange={setListingStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='private'>Privat (hanya kode)</SelectItem>
                      <SelectItem value='pending_public'>Menunggu review guru → admin</SelectItem>
                      <SelectItem value='public'>Publik (muncul di daftar siswa)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='mt-1 text-xs text-gray-500'>
                    Hanya admin yang dapat menyetujui publik. Guru mengajukan lewat pending.
                  </p>
                </div>
                <div>
                  <Label>Teacher</Label>
                  <Select value={teacherId} onValueChange={setTeacherId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>No teacher</SelectItem>
                      {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.email})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Student Count</Label>
                  <Input type='number' value={studentCount} onChange={(e) => setStudentCount(e.target.value)} />
                </div>
                <div>
                  <Label>Average Score</Label>
                  <Input type='number' value={averageScore} onChange={(e) => setAverageScore(e.target.value)} />
                </div>
                <div>
                  <Label>Attach Cases</Label>
                  <div className='max-h-48 space-y-1 overflow-y-auto rounded-md border p-2'>
                    {cases.map((c) => (
                      <label key={c.id} className='flex items-start gap-2 text-sm'>
                        <input
                          type='checkbox'
                          checked={selectedCaseIds.includes(c.id)}
                          onChange={(e) => {
                            setSelectedCaseIds((prev) =>
                              e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                            );
                          }}
                        />
                        <span>{c.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={save} className='w-full bg-linear-to-r from-purple-200 to-blue-200 text-purple-700'>Save</Button>
              </div>
            ) : null}
          </aside>
        </>
      ) : null}
    </>
  );
}
