import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createAdminClass, deleteAdminClass, fetchAdminClasses } from '@/lib/api/admin';

export default function ClassManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('7');
  const [subject, setSubject] = useState('');
  const [workMode, setWorkMode] = useState('individual');
  const nameInputRef = useRef(null);

  const refresh = async () => {
    try {
      const data = await fetchAdminClasses({ page_size: 500 });
      setRows(data?.classes ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat kelas');
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchAdminClasses({ page_size: 500 })
      .then((data) => {
        if (!cancelled) setRows(data?.classes ?? []);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Gagal memuat kelas');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    const id = window.setTimeout(() => {
      setShowCreateModal(true);
      setSearchParams({}, { replace: true });
      window.setTimeout(() => nameInputRef.current?.focus(), 0);
    }, 0);
    return () => window.clearTimeout(id);
  }, [searchParams, setSearchParams]);

  const classCode = (c) =>
    c.join_code ||
    c.code ||
    c.class_code ||
    `${String(c.name || '').toUpperCase().replaceAll(/\s+/g, '-')}-${c.id}`;

  const listingBadge = (c) => {
    const s = c.listing_status || 'private';
    if (s === 'public') return 'Publik';
    if (s === 'pending_public') return 'Review admin';
    return 'Privat';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || (r.teacher_name || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  function closeCreateModal() {
    setShowCreateModal(false);
  }

  const createClass = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Nama kelas wajib diisi');
      return;
    }
    const gradeNum = Number(grade);
    if (grade === '' || Number.isNaN(gradeNum)) {
      toast.error('Grade wajib diisi');
      return;
    }
    try {
      const payload = {
        name: trimmedName,
        grade: gradeNum,
        student_count: 0,
        work_mode: workMode,
      };
      const subj = subject.trim();
      if (subj) payload.subject = subj;
      await createAdminClass(payload);
      setName('');
      setGrade('7');
      setSubject('');
      setWorkMode('individual');
      setShowCreateModal(false);
      toast.success('Kelas dibuat');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat kelas');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Hapus kelas ini?')) return;
    try {
      await deleteAdminClass(id);
      toast.success('Kelas dihapus');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus kelas');
    }
  };

  return (
    <div className='min-h-screen bg-white'>
      <nav className='sticky top-0 z-50 border-b border-gray-200 bg-white'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between gap-3'>
            <Link to='/teacher' className='flex shrink-0 items-center gap-2 text-gray-600 hover:text-gray-900'>
              <ArrowLeft className='h-5 w-5' />
              Back to Dashboard
            </Link>
            <div className='flex min-w-0 flex-1 items-center justify-center gap-3'>
              <Search className='h-5 w-5 shrink-0 text-purple-600' />
              <span className='truncate font-bold text-gray-900'>Class Management</span>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              <Button type='button' size='sm' onClick={() => setShowCreateModal(true)}>
                <Plus className='mr-2 h-4 w-4' />
                Buat kelas
              </Button>
              <LogoutButton variant='outline' />
            </div>
          </div>
        </div>
      </nav>

      <main className='mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
        <Card>
          <CardContent className='space-y-4 p-4'>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search class/teacher...'
            />
            <div className='space-y-3'>
              {filtered.map((c) => (
                <div key={c.id} className='flex items-center justify-between gap-3 rounded-xl border p-4'>
                  <div>
                    <div className='flex items-center gap-2 font-semibold'>
                      <GraduationCap className='h-4 w-4 text-purple-600' />
                      {c.name}
                    </div>
                    <div className='text-sm text-gray-600'>
                      Grade {c.grade ?? '-'} • {listingBadge(c)} • {c.work_mode === 'group' ? 'Kelompok' : 'Individu'} •{' '}
                      {c.student_count || 0} students • {c.case_count || 0} cases • {c.puzzle_count || 0} puzzles
                      {c.subject ? ` • ${c.subject}` : ''}
                    </div>
                    <div className='text-xs text-gray-500'>Teacher: {c.teacher_name || '—'}</div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button variant='outline' asChild>
                      <Link to={`/teacher/classes/${encodeURIComponent(classCode(c))}`}>Detail</Link>
                    </Button>
                    <Button variant='outline' size='icon' onClick={() => remove(c.id)}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 ? <p className='text-sm text-gray-500'>Tidak ada kelas.</p> : null}
            </div>
          </CardContent>
        </Card>
      </main>

      {showCreateModal ? (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4'
          role='dialog'
          aria-modal='true'
          aria-labelledby='create-class-title'
        >
          <Card className='w-full max-w-lg rounded-2xl border border-gray-200 shadow-xl'>
            <CardContent className='space-y-4 p-6'>
              <div className='flex items-start justify-between gap-3'>
                <h2 id='create-class-title' className='text-lg font-bold text-gray-900'>
                  Buat kelas baru
                </h2>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='shrink-0'
                  onClick={closeCreateModal}
                  aria-label='Tutup'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='class-name'>
                  Nama kelas <span className='text-red-600'>*</span>
                </Label>
                <Input
                  id='class-name'
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Contoh: Matematika 7A'
                  autoComplete='off'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='class-grade'>
                  Grade <span className='text-red-600'>*</span>
                </Label>
                <Input
                  id='class-grade'
                  type='number'
                  min={1}
                  max={12}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder='7'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='class-subject'>Mata pelajaran (opsional)</Label>
                <Input
                  id='class-subject'
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder='Contoh: Matematika'
                  autoComplete='off'
                />
              </div>
              <div className='space-y-2'>
                <Label>Mode pengerjaan</Label>
                <Select value={workMode} onValueChange={setWorkMode}>
                  <SelectTrigger id='class-work-mode'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='individual'>Individu</SelectItem>
                    <SelectItem value='group'>Kelompok</SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-xs text-gray-500'>
                  Kelompok: siswa mengerjakan case secara berkelompok; Individu: mandiri.
                </p>
              </div>
              <div className='flex flex-wrap justify-end gap-2 pt-2'>
                <Button type='button' variant='outline' onClick={closeCreateModal}>
                  Batal
                </Button>
                <Button type='button' onClick={createClass}>
                  Simpan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
