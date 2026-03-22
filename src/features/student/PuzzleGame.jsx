import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Lightbulb,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';

import { AnomathLogoMark } from '@/components/branding/anomath-logo';
import { CaseFlowPageSkeleton } from '@/components/common/page-skeletons';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  findPuzzleByStage,
  getCase,
  getFirstPuzzleOrder,
  listPuzzles,
  sortPuzzlesByOrder,
  submitPuzzleAnswer,
} from '@/lib/api/cases';
import { getProgress } from '@/lib/api/progress';
import { StudentPuzzleResponse } from '@/features/student/student-puzzle-response';

function answerHintForType(puzzleType) {
  switch (puzzleType) {
    case 'True/False':
    case 'Multiple Choice':
      return 'Pilih salah satu opsi. Perbandingan jawaban tidak case-sensitive.';
    case 'Fill in the Blank':
      return 'Isi jawaban teks; spasi diabaikan, huruf besar/kecil tidak mempengaruhi.';
    case 'Ordering':
      return 'Susun urutan dengan mengklik item; jawaban dikirim sebagai teks dipisah |.';
    case 'Matching':
      return 'Pilih pasangan kiri–kanan atau isi manual format kiri|kanan.';
    default:
      return 'Jawaban teks; perbandingan tidak case-sensitive.';
  }
}

export default function PuzzleGame() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stageRaw = searchParams.get('stage');
  const parsedStage =
    stageRaw !== null && stageRaw !== '' ? Number(stageRaw) : Number.NaN;

  const [caseTitle, setCaseTitle] = useState('');
  const [puzzles, setPuzzles] = useState([]);
  const [progressRow, setProgressRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showAiHint, setShowAiHint] = useState(false);
  const aiHintUnlocked = false;

  const [timeLeft] = useState(300);

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
        setCaseTitle(c?.title || '');
        setPuzzles(sortPuzzlesByOrder(pz?.puzzles || []));
        setProgressRow(prog && prog.case_id ? prog : null);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Gagal memuat puzzle');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const sortedPuzzles = useMemo(() => sortPuzzlesByOrder(puzzles), [puzzles]);
  const firstOrder = getFirstPuzzleOrder(sortedPuzzles);
  const effectiveStage = Number.isFinite(parsedStage) ? parsedStage : firstOrder;

  useEffect(() => {
    if (!caseId || !sortedPuzzles.length || loading) return;

    if (progressRow && !progressRow.is_completed) {
      const expected = Number(progressRow.current_puzzle);
      if (Number.isFinite(expected) && parsedStage !== expected) {
        navigate(`/puzzle/${caseId}?stage=${expected}`, { replace: true });
      }
      return;
    }

    if (!Number.isFinite(parsedStage) && Number.isFinite(firstOrder)) {
      navigate(`/puzzle/${caseId}?stage=${firstOrder}`, { replace: true });
    }
  }, [
    caseId,
    sortedPuzzles.length,
    loading,
    progressRow,
    parsedStage,
    firstOrder,
    navigate,
  ]);

  const puzzle = useMemo(
    () => findPuzzleByStage(sortedPuzzles, effectiveStage),
    [sortedPuzzles, effectiveStage],
  );

  const puzzleType =
    puzzle?.puzzle_meta?.puzzleType || 'Multiple Choice';

  const totalStages = sortedPuzzles.length;
  const stageIndex = puzzle ? sortedPuzzles.indexOf(puzzle) + 1 : 1;

  useEffect(() => {
    setAnswerText('');
    setShowResult(false);
    setLastResult(null);
    setShowAiHint(false);
  }, [effectiveStage, puzzle?.id]);

  async function handleSubmit() {
    if (!puzzle?.id || !answerText.trim()) return;
    setSubmitLoading(true);
    try {
      const data = await submitPuzzleAnswer(puzzle.id, answerText.trim());
      setLastResult(data);
      setShowResult(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit gagal');
    } finally {
      setSubmitLoading(false);
    }
  }

  const isCorrect = showResult && lastResult?.correct === true;

  if (loading) {
    return (
      <CaseFlowPageSkeleton shellClassName='min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-pink-50' />
    );
  }

  if (!puzzle) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center gap-4 p-8'>
        <p className='text-gray-700'>Belum ada puzzle untuk case ini.</p>
        <Button asChild>
          <Link to='/student'>Kembali</Link>
        </Button>
      </div>
    );
  }

  const nextHref =
    isCorrect && lastResult?.next_puzzle != null
      ? `/puzzle/${caseId}?stage=${lastResult.next_puzzle}`
      : isCorrect
        ? `/case/${caseId}/board`
        : `/puzzle/${caseId}?stage=${effectiveStage}`;

  const nextLabel =
    isCorrect && lastResult?.next_puzzle != null
      ? 'Next Stage'
      : isCorrect
        ? 'Analyze Clues'
        : 'Retry';

  return (
    <div className='min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-pink-50'>
      <div className='bg-white border-b border-gray-200 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 w-full items-center gap-3'>
            <Link to='/student' className='inline-flex shrink-0 items-center gap-2 text-gray-600 hover:text-gray-900'>
              <ArrowLeft className='w-5 h-5' />
              <span className='hidden sm:inline'>Back to Dashboard</span>
            </Link>

            <div className='ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-4'>
              <div className='flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 sm:px-4'>
                <Clock className='h-5 w-5 shrink-0 text-blue-600' />
                <span className='font-bold text-blue-700'>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
              </div>
              <div className='flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 sm:px-4'>
                <Trophy className='h-5 w-5 shrink-0 text-yellow-600' />
                <span className='font-bold text-yellow-700'>{lastResult?.score ?? '—'}</span>
              </div>
              <LogoutButton className='shrink-0 rounded-full border-gray-200' variant='outline' size='sm' />
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card className='rounded-3xl border border-gray-200 shadow-lg mb-6'>
          <CardContent className='p-6 sm:p-8'>
            <div className='flex items-start gap-4 mb-4'>
              <AnomathLogoMark size='xl' decorative={false} />
              <div className='flex-1'>
                <div className='flex items-center gap-3 mb-2'>
                  <span className='text-sm text-gray-500'>Case</span>
                  <span className='px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold'>
                    Tahap {stageIndex}/{totalStages || 1}
                  </span>
                  <span className='rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600'>
                    {puzzleType}
                  </span>
                </div>
                <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>{caseTitle || `Case ${caseId}`}</h1>
              </div>
            </div>

            <div className='mb-4'>
              <div className='flex items-center justify-between text-sm mb-2'>
                <span className='text-gray-600 font-medium'>Case Progress</span>
                <span className='text-gray-900 font-bold'>
                  {totalStages ? Math.round((stageIndex / totalStages) * 100) : 0}%
                </span>
              </div>
              <Progress value={totalStages ? (stageIndex / totalStages) * 100 : 0} />
            </div>

            <div className='flex items-center gap-2 text-sm'>
              <Sparkles className='w-4 h-4 text-yellow-500' />
              <span className='text-gray-600'>{answerHintForType(puzzleType)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-linear-to-br from-pink-100 to-yellow-100 rounded-2xl border border-pink-200 shadow-md mb-6'>
          <CardContent className='p-6'>
            <div className='flex items-start gap-3'>
              <div className='w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center shrink-0'>
                <Lightbulb className='w-6 h-6 text-pink-600' />
              </div>
              <div>
                <h3 className='font-bold text-gray-900 mb-2'>Detective Note</h3>
                <p className='text-gray-700 leading-relaxed'>
                  Tampilan soal mengikuti tipe yang dipilih guru di Case Builder. Petunjuk tambahan ada di explanation
                  jika diisi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-3xl border border-gray-200 shadow-xl mb-6'>
          <CardContent className='p-8 sm:p-10'>
            <div className='text-center mb-8'>
              <div className='inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4'>
                <Star className='w-4 h-4 text-blue-600' />
                <span className='text-sm font-semibold text-blue-700'>Puzzle</span>
              </div>
              <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 leading-relaxed'>{puzzle.question}</h2>
            </div>

            {!showResult ? (
              <div className='space-y-4 mb-8'>
                <StudentPuzzleResponse
                  puzzleId={puzzle.id}
                  puzzleMeta={puzzle.puzzle_meta}
                  answerText={answerText}
                  onAnswerChange={setAnswerText}
                  disabled={submitLoading}
                  onSubmitAttempt={() => {
                    if (!submitLoading) handleSubmit();
                  }}
                />
              </div>
            ) : null}

            {!showResult ? (
              aiHintUnlocked ? (
                <Card className='bg-yellow-50 rounded-xl border border-yellow-200 mb-6'>
                  <CardContent className='p-4'>
                    <div className='flex items-start gap-3'>
                      <Lightbulb className='w-5 h-5 text-yellow-600 shrink-0 mt-0.5' />
                      <div className='w-full'>
                        <div className='font-semibold text-yellow-800 mb-2'>AI Hint (Pro)</div>
                        {showAiHint ? (
                          <p className='text-sm text-yellow-700'>{puzzle.explanation || '—'}</p>
                        ) : (
                          <Button
                            type='button'
                            variant='outline'
                            className='h-auto bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-100'
                            onClick={() => setShowAiHint(true)}
                          >
                            Reveal explanation
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className='bg-gray-50 rounded-xl border border-gray-200 mb-6'>
                  <CardContent className='p-4'>
                    <div className='flex items-start gap-3'>
                      <Lightbulb className='w-5 h-5 text-gray-500 shrink-0 mt-0.5' />
                      <div>
                        <div className='font-semibold text-gray-800 mb-1'>Petunjuk</div>
                        <p className='text-sm text-gray-600'>
                          {puzzle.explanation ? (
                            <button type='button' className='text-purple-600 underline' onClick={() => setShowAiHint(true)}>
                              Tampilkan explanation dari guru
                            </button>
                          ) : (
                            'Belum ada explanation untuk puzzle ini.'
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ) : null}

            {showResult ? (
              <Card className={`mb-6 ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <CardContent className='p-6'>
                  <h3 className={`text-xl font-bold mb-2 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                    {isCorrect ? 'Jawaban benar!' : 'Belum tepat'}
                  </h3>
                  <p className={`${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect
                      ? `Skor: ${lastResult?.score ?? '—'}`
                      : 'Periksa lagi soal atau minta petunjuk.'}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {!showResult ? (
              <Button
                onClick={handleSubmit}
                disabled={!answerText.trim() || submitLoading}
                className='w-full py-6 bg-linear-to-r from-purple-300 to-blue-300 text-purple-700 hover:text-purple-700'
              >
                {submitLoading ? 'Mengirim…' : 'Submit Answer'}
              </Button>
            ) : (
              <Button asChild className='w-full py-6 bg-linear-to-r from-purple-300 to-blue-300 text-purple-700 hover:text-purple-700'>
                <Link to={nextHref}>{nextLabel}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
