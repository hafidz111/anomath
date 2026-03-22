import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CaseFlowPageSkeleton } from '@/components/common/page-skeletons';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getFirstPuzzleOrder, listPuzzles, sortPuzzlesByOrder } from '@/lib/api/cases';
import { getProgress } from '@/lib/api/progress';

export default function InvestigationBoard() {
  const { caseId } = useParams();
  const [puzzles, setPuzzles] = useState([]);
  const [progressRow, setProgressRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClues, setSelectedClues] = useState([]);
  const [suspect, setSuspect] = useState('');

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    Promise.all([listPuzzles(caseId), getProgress(caseId).catch(() => null)])
      .then(([pz, prog]) => {
        if (cancelled) return;
        setPuzzles(sortPuzzlesByOrder(pz?.puzzles || []));
        setProgressRow(prog && (prog.case_id || prog.current_puzzle != null) ? prog : null);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Gagal memuat clue');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const clues = useMemo(() => {
    if (!puzzles.length) return [];
    const firstOrder = getFirstPuzzleOrder(puzzles);
    const nextOrder = progressRow?.is_completed
      ? Infinity
      : progressRow?.current_puzzle != null
        ? Number(progressRow.current_puzzle)
        : firstOrder;
    return puzzles
      .filter((p) =>
        progressRow?.is_completed || Number(p.order) < nextOrder,
      )
      .map((p) => ({
        id: String(p.id),
        title: `Puzzle ${p.order}`,
        detail:
          (p.explanation && String(p.explanation).trim()) ||
          `${String(p.question).slice(0, 160)}${String(p.question).length > 160 ? '…' : ''}`,
      }));
  }, [puzzles, progressRow]);

  const toggleClue = (id) => {
    setSelectedClues((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const allUnlockedSelected =
    clues.length > 0 && clues.every((clue) => selectedClues.includes(clue.id));

  if (loading) {
    return (
      <CaseFlowPageSkeleton
        shellClassName='min-h-screen bg-[#f8f9ff]'
        innerMax='max-w-5xl'
      />
    );
  }

  return (
    <div className='min-h-screen bg-[#f8f9ff]'>
      <nav className='bg-white border-b sticky top-0 z-50'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2'>
          <Link to={`/puzzle/${caseId}`} className='inline-flex items-center gap-2 justify-self-start text-gray-600 hover:text-purple-600'>
            <ArrowLeft className='w-5 h-5 shrink-0' />
            Back
          </Link>
          <div className='inline-flex items-center gap-2 justify-self-center text-purple-600 font-bold'>
            <Search className='w-6 h-6 shrink-0' />
            Investigation Board
          </div>
          <div className='justify-self-end'>
            <LogoutButton className='shrink-0 rounded-full border-0 bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 hover:opacity-95' variant='ghost' size='sm' />
          </div>
        </div>
      </nav>

      <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
        <Card className='rounded-3xl border border-gray-200'>
          <CardContent className='p-6'>
            <div className='inline-flex items-center gap-2 mb-2'>
              <ClipboardList className='w-5 h-5 text-purple-600' />
              <h1 className='text-2xl font-bold text-gray-900'>Analyze Your Clues</h1>
            </div>
            <p className='text-sm text-gray-600'>
              Clue berasal dari puzzle yang sudah diselesaikan (explanation guru, atau ringkasan soal).
            </p>
          </CardContent>
        </Card>

        {clues.length === 0 ? (
          <Card className='rounded-2xl border border-amber-200 bg-amber-50'>
            <CardContent className='p-5 text-sm text-amber-900'>
              Belum ada clue terbuka. Selesaikan setidaknya puzzle pertama, lalu buka kembali halaman ini dari alur puzzle.
            </CardContent>
          </Card>
        ) : null}

        <div className='grid md:grid-cols-2 gap-4'>
          {clues.map((clue) => (
            <Card key={clue.id} className='rounded-2xl border border-purple-200 bg-white'>
              <CardContent className='p-5'>
                <div className='flex items-center justify-between mb-2'>
                  <p className='font-semibold text-gray-900'>{clue.title}</p>
                  <span className='text-xs px-2 py-1 rounded-full bg-green-100 text-green-700'>Unlocked</span>
                </div>
                <p className='text-sm text-gray-600 mb-3'>{clue.detail}</p>
                <Button type='button' variant='outline' onClick={() => toggleClue(clue.id)}>
                  {selectedClues.includes(clue.id) ? 'Remove from analysis' : 'Use for analysis'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className='rounded-2xl border border-gray-200'>
          <CardContent className='p-6 space-y-3'>
            <p className='font-semibold text-gray-900'>Primary suspect hypothesis</p>
            <div className='flex flex-wrap gap-2'>
              {['Suspect A', 'Suspect B', 'Suspect C'].map((name) => (
                <button
                  key={name}
                  type='button'
                  onClick={() => setSuspect(name)}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                    suspect === name
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className='text-xs text-gray-500'>
              Selected clues: {selectedClues.length} / {clues.length || 1}
            </p>
            {!allUnlockedSelected && clues.length > 0 ? (
              <p className='text-xs text-amber-600'>Pilih semua clue untuk analisis yang lebih kuat.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className='flex justify-end'>
          <Button
            asChild
            className='bg-linear-to-r from-purple-300 to-blue-300 text-purple-700'
            disabled={!allUnlockedSelected || suspect === '' || clues.length === 0}
          >
            <Link to={`/case/${caseId}/final`} state={{ selectedClues, suspect }}>
              Proceed to Final Deduction
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
