import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCaseRecordApiId } from '@/lib/api/cases';
import { resetCaseProgress } from '@/lib/api/progress';

/**
 * Form reset progres case untuk guru/admin.
 * @param {object} props
 * @param {Array<{ id?: string, title?: string, is_draft?: boolean }>} props.cases
 * @param {Array<{ id: string, name?: string, email?: string }>} props.students
 * @param {string} props.classroomId — UUID kelas (untuk scope team)
 * @param {() => void} [props.onSuccess]
 */
export function CaseProgressResetPanel({ cases, students, classroomId, onSuccess }) {
  const [caseId, setCaseId] = useState('');
  const [scope, setScope] = useState('individual');
  const [studentId, setStudentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const attachableCases = useMemo(() => {
    return (cases || []).filter((c) => {
      const id = getCaseRecordApiId(c);
      return Boolean(id) && !c.is_draft;
    });
  }, [cases]);

  async function handleSubmit() {
    const cid = caseId.trim();
    if (!cid) {
      toast.error('Pilih case');
      return;
    }
    if (scope === 'individual' && !studentId.trim()) {
      toast.error('Pilih siswa');
      return;
    }
    if (scope === 'team' && !classroomId?.trim()) {
      toast.error('ID kelas tidak valid');
      return;
    }

    const body = { case_id: cid, scope };
    if (scope === 'individual') body.user_id = studentId.trim();
    if (scope === 'team') body.classroom_id = classroomId.trim();

    const ok = window.confirm(
      scope === 'all'
        ? 'Reset semua progres untuk case ini sesuai aturan akses Anda?'
        : scope === 'team'
          ? 'Reset progres case ini untuk semua siswa di kelas (tim) ini?'
          : 'Reset progres case ini untuk siswa yang dipilih?',
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await resetCaseProgress(body);
      const n = res?.deleted ?? 0;
      toast.success(`Progres direset (${Number(n)} baris).`);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal reset progres');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='space-y-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4'>
      <div>
        <h3 className='text-base font-bold text-gray-900'>Reset progres siswa</h3>
        <p className='mt-1 text-xs text-gray-600'>
          Hanya guru kelas atau admin. Tim = semua siswa terdaftar di kelas ini. Semua = semua siswa
          yang relevan untuk case ini (guru: di semua kelas Anda yang memuat case; admin: seluruh
          pengguna pada case).
        </p>
      </div>

      <div className='space-y-2'>
        <Label>Case</Label>
        <Select value={caseId} onValueChange={setCaseId}>
          <SelectTrigger className='bg-white'>
            <SelectValue placeholder='Pilih case (bukan draft)' />
          </SelectTrigger>
          <SelectContent position='popper' className='z-60'>
            {attachableCases.map((c) => {
              const id = getCaseRecordApiId(c);
              return (
                <SelectItem key={id} value={id}>
                  {c.title || id}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {attachableCases.length === 0 ? (
          <p className='text-xs text-amber-900'>Tidak ada case terbit untuk direset.</p>
        ) : null}
      </div>

      <div className='space-y-2'>
        <Label>Cakupan</Label>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className='bg-white'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position='popper' className='z-60'>
            <SelectItem value='individual'>Per individu (pilih siswa)</SelectItem>
            <SelectItem value='team'>Tim / seluruh siswa di kelas ini</SelectItem>
            <SelectItem value='all'>Semua (terkait case)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scope === 'individual' ? (
        <div className='space-y-2'>
          <Label>Siswa</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className='bg-white'>
              <SelectValue placeholder='Pilih siswa' />
            </SelectTrigger>
            <SelectContent position='popper' className='z-60'>
              {(students || []).map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {(s.name || 'Tanpa nama') + (s.email ? ` · ${s.email}` : '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(!students || students.length === 0) && (
            <p className='text-xs text-gray-600'>Belum ada siswa terdaftar di kelas.</p>
          )}
        </div>
      ) : null}

      <Button
        type='button'
        variant='destructive'
        className='w-full'
        disabled={
          submitting ||
          !caseId ||
          attachableCases.length === 0 ||
          (scope === 'individual' && (!students?.length || !studentId)) ||
          (scope === 'team' && !classroomId)
        }
        onClick={() => void handleSubmit()}
      >
        {submitting ? 'Memproses…' : 'Reset progres'}
      </Button>
    </div>
  );
}
