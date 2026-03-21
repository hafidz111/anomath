import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, Play } from 'lucide-react';
import { toast } from 'sonner';

import { AnomathLogo } from '@/components/branding/anomath-logo';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCase, listPuzzles } from '@/lib/api/cases';
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
  const [puzzleCount, setPuzzleCount] = useState(0);
  const [progressRow, setProgressRow] = useState(null);
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    Promise.all([getCase(caseId), listPuzzles(caseId), getProgress(caseId).catch(() => null)])
      .then(([c, pz, prog]) => {
        if (cancelled) return;
        setCaseData(c);
        setPuzzleCount(pz?.puzzles?.length ?? 0);
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
    const n = puzzleCount || 1;
    return Array.from({ length: n }, (_, i) => ({
      number: i + 1,
      title: `Stage ${i + 1}`,
      topic: 'Math puzzle',
    }));
  }, [puzzleCount]);

  const completedStages = useMemo(() => {
    if (!progressRow || !puzzleCount) return [];
    if (progressRow.is_completed) return stages.map((s) => s.number);
    const nextOrder = progressRow.current_puzzle;
    const done = [];
    for (let o = 1; o < nextOrder; o += 1) done.push(o);
    return done;
  }, [progressRow, puzzleCount, stages]);

  const nextStage =
    stages.find((stage) => !completedStages.includes(stage.number))?.number ?? null;
  const progressPercent = stages.length
    ? Math.round((completedStages.length / stages.length) * 100)
    : 0;

  const handleResetProgress = () => {
    setResetMessage('Reset progres hanya via backend / admin.');
    setTimeout(() => setResetMessage(''), 2000);
  };

  const diffKey = (caseData?.difficulty || 'easy').toLowerCase();
  const diffBadge = difficultyTheme[diffKey] || difficultyTheme.easy;

  if (loading) {
    return (
      <div className='min-h-screen bg-white flex items-center justify-center'>
        <p className='text-gray-600'>Memuat case…</p>
      </div>
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
                <Clock className='w-4 h-4' /> Est. {Math.max(5, (puzzleCount || 1) * 5)} min
              </span>
            </div>
            <h1 className='text-3xl font-bold text-gray-900 mb-3'>{caseData?.title}</h1>
            <p className='text-gray-700 leading-relaxed whitespace-pre-wrap'>{caseData?.description}</p>
          </CardContent>
        </Card>

        <Card className='rounded-2xl border border-gray-200 bg-white'>
          <CardContent className='p-6'>
            <h2 className='text-xl font-bold text-gray-900 mb-4'>Stages</h2>
            <div className='space-y-3'>
              {stages.map((stage) => (
                <div
                  key={stage.number}
                  className='flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100'
                >
                  <div className='flex items-center gap-3'>
                    <span className='w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center'>
                      {stage.number}
                    </span>
                    <div>
                      <p className='font-semibold text-gray-900'>{stage.title}</p>
                      <p className='text-sm text-gray-600'>{stage.topic}</p>
                    </div>
                  </div>
                  {completedStages.includes(stage.number) ? (
                    <CheckCircle className='w-6 h-6 text-green-600' />
                  ) : (
                    <span className='text-xs text-gray-500'>Pending</span>
                  )}
                </div>
              ))}
            </div>
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

        <div className='flex flex-wrap gap-3 justify-between items-center'>
          <Button variant='outline' type='button' onClick={handleResetProgress}>
            Reset progress (info)
          </Button>
          {resetMessage ? <span className='text-sm text-gray-600'>{resetMessage}</span> : null}
          <Button asChild className='bg-linear-to-r from-purple-300 to-blue-300 text-purple-700'>
            <Link to={nextStage != null ? `/puzzle/${caseId}?stage=${nextStage}` : `/puzzle/${caseId}?stage=1`}>
              <Play className='w-4 h-4 mr-2' />
              {completedStages.length ? 'Continue' : 'Start puzzles'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
