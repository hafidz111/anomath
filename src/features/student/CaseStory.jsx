import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, Play } from 'lucide-react';
import { toast } from 'sonner';

import { CaseFlowPageSkeleton } from '@/components/common/page-skeletons';
import { AnomathLogo } from '@/components/branding/anomath-logo';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCase, listPuzzles, sortPuzzlesByOrder } from '@/lib/api/cases';
import { getProgress } from '@/lib/api/progress';

const difficultyTheme = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-orange-100 text-orange-700',
};

function capDiff(d) {
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export default function CaseStory() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [sortedPuzzles, setSortedPuzzles] = useState([]);
  const [progressRow, setProgressRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    Promise.all([
      getCase(caseId),
      listPuzzles(caseId),
      getProgress(caseId).catch(() => null),
    ])
      .then(([c, pz, prog]) => {
        if (cancelled) return;
        setCaseData(c);
        setSortedPuzzles(sortPuzzlesByOrder(pz?.puzzles || []));
        setProgressRow(prog && prog.case_id ? prog : null);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Gagal memuat cerita case');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const stages = useMemo(() => {
    return sortedPuzzles.map((p, i) => ({
      displayIndex: i + 1,
      order: Number(p.order),
      title: `Puzzle ${i + 1}`,
      topic: p.difficulty ? capDiff(p.difficulty) : 'Math puzzle',
      puzzleType: p.puzzle_meta?.puzzleType || 'Multiple Choice',
    }));
  }, [sortedPuzzles]);

  const completedDisplayIndices = useMemo(() => {
    if (!sortedPuzzles.length) return [];
    if (progressRow?.is_completed) {
      return sortedPuzzles.map((_, i) => i + 1);
    }
    if (!progressRow?.current_puzzle) return [];
    const nextIdx = sortedPuzzles.findIndex(
      (p) => Number(p.order) === Number(progressRow.current_puzzle),
    );
    if (nextIdx <= 0) return [];
    return sortedPuzzles.slice(0, nextIdx).map((_, i) => i + 1);
  }, [progressRow, sortedPuzzles]);

  const puzzleEntryHref = useMemo(() => {
    if (!sortedPuzzles.length) return `/student`;
    if (progressRow?.is_completed) {
      return `/case/${caseId}/board`;
    }
    const next = sortedPuzzles.find(
      (p) => Number(p.order) === Number(progressRow?.current_puzzle),
    );
    const target = next ?? sortedPuzzles[0];
    if (!target) return `/student`;
    return `/puzzle/${caseId}?stage=${target.order}`;
  }, [caseId, sortedPuzzles, progressRow]);

  const progressPercent = stages.length
    ? Math.round((completedDisplayIndices.length / stages.length) * 100)
    : 0;

  const diffKey = (caseData?.difficulty || 'easy').toLowerCase();
  const diffBadge = difficultyTheme[diffKey] || difficultyTheme.easy;

  if (loading) {
    return (
      <CaseFlowPageSkeleton shellClassName='min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-pink-50' />
    );
  }

  if (!caseData) {
    return (
      <div className='min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-8'>
        <p className='text-gray-700'>Case tidak ditemukan.</p>
        <Button asChild>
          <Link to='/student'>Kembali</Link>
        </Button>
      </div>
    );
  }

  const continueLabel =
    progressRow?.is_completed
      ? 'Lanjut ke papan investigasi'
      : completedDisplayIndices.length
        ? 'Lanjut puzzle'
        : 'Mulai puzzle';

  return (
    <div className='min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-pink-50'>
      <nav className='bg-white border-b border-gray-200 sticky top-0 z-50'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2'>
          <Link to={`/case/${caseId}`} className='inline-flex items-center gap-2 justify-self-start text-gray-600 hover:text-purple-600'>
            <ArrowLeft className='w-5 h-5 shrink-0' />
            Back
          </Link>
          <div className='justify-self-center'>
            <AnomathLogo size='sm' wordmarkVariant='brand' />
          </div>
          <div className='justify-self-end'>
            <LogoutButton className='shrink-0 rounded-full border-0 bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 hover:opacity-95' variant='ghost' size='sm' />
          </div>
        </div>
      </nav>

      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
        <Card className='rounded-3xl border border-purple-200 bg-white shadow-sm'>
          <CardContent className='p-8'>
            <div className='flex flex-wrap items-center gap-2 mb-4'>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${diffBadge}`}>
                {capDiff(caseData?.difficulty)}
              </span>
              <span className='text-sm text-gray-500 flex items-center gap-1'>
                <Clock className='w-4 h-4' /> Est. {Math.max(5, (sortedPuzzles.length || 1) * 5)} min
              </span>
            </div>
            <h1 className='text-3xl font-bold text-gray-900 mb-3'>{caseData?.title}</h1>
            <p className='text-gray-700 leading-relaxed whitespace-pre-wrap'>{caseData?.description}</p>
          </CardContent>
        </Card>

        <Card className='rounded-2xl border border-gray-200 bg-white'>
          <CardContent className='p-6'>
            <h2 className='text-xl font-bold text-gray-900 mb-4'>Alur puzzle</h2>
            <p className='text-sm text-gray-600 mb-4'>
              Urutan sama dengan Case Builder (field <span className='font-mono'>order</span> di server).
              Tipe soal ditampilkan ke siswa sesuai pengaturan guru.
            </p>
            <div className='space-y-3'>
              {stages.map((stage) => (
                <div
                  key={`${stage.order}-${stage.displayIndex}`}
                  className='flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <span className='w-8 h-8 shrink-0 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center'>
                      {stage.displayIndex}
                    </span>
                    <div className='min-w-0'>
                      <p className='font-semibold text-gray-900'>{stage.title}</p>
                      <p className='text-sm text-gray-600 truncate'>
                        {stage.topic} · {stage.puzzleType}
                      </p>
                    </div>
                  </div>
                  {completedDisplayIndices.includes(stage.displayIndex) ? (
                    <CheckCircle className='w-6 h-6 text-green-600 shrink-0' />
                  ) : (
                    <span className='text-xs text-gray-500 shrink-0'>Pending</span>
                  )}
                </div>
              ))}
            </div>
            {stages.length === 0 ? (
              <p className='text-sm text-gray-500 py-2'>Belum ada puzzle di case ini.</p>
            ) : null}
            <div className='mt-4'>
              <div className='flex justify-between text-sm mb-1'>
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
                <div className='h-full bg-purple-500 transition-all' style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='flex flex-wrap gap-3 justify-end items-center'>
          <Button asChild className='bg-linear-to-r from-purple-300 to-blue-300 text-purple-700'>
            <Link to={puzzleEntryHref}>
              <Play className='w-4 h-4 mr-2' />
              {continueLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
