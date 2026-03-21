import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Check,
  CloudUpload,
  Eye,
  Lightbulb,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';

import { TeacherTopBar } from '@/components/teacher/teacher-top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createPuzzle, listPuzzles } from '@/lib/api/cases';

const demoRecent = [
  {
    id: 1,
    question: 'Solve: 2x + 5 = 15',
    type: 'Multiple Choice',
    points: 50,
    theme: 'from-purple-100 to-purple-50 border-purple-200',
  },
  {
    id: 2,
    question: 'What is 25% of 80?',
    type: 'Fill in the Blank',
    points: 40,
    theme: 'from-blue-100 to-blue-50 border-blue-200',
  },
  {
    id: 3,
    question: 'Area of triangle formula',
    type: 'True/False',
    points: 30,
    theme: 'from-pink-100 to-pink-50 border-pink-200',
  },
];

export default function PuzzleBuilder() {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId') || searchParams.get('caseUuid');
  const classCodeFromQuery = searchParams.get('classCode');

  const [question, setQuestion] = useState(
    'If x + 15 = 42, what is the value of x?',
  );
  const [puzzleType, setPuzzleType] = useState('Multiple Choice');
  const [clueText, setClueText] = useState(
    'Equation result points to code fragment: 27-',
  );
  const [answers, setAnswers] = useState([
    { text: '27', correct: true },
    { text: '32', correct: false },
    { text: '57', correct: false },
    { text: '21', correct: false },
  ]);
  /** `undefined` = belum selesai fetch untuk `caseId` ini */
  const [casePuzzleRows, setCasePuzzleRows] = useState(undefined);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    listPuzzles(caseId)
      .then((data) => {
        if (cancelled) return;
        const list = data?.puzzles ?? [];
        setCasePuzzleRows(
          list.map((p, i) => ({
            id: p.id,
            question: p.question,
            type: 'Puzzle',
            points: 50,
            theme: [
              'from-purple-100 to-purple-50 border-purple-200',
              'from-blue-100 to-blue-50 border-blue-200',
              'from-pink-100 to-pink-50 border-pink-200',
            ][i % 3],
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setCasePuzzleRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const listLoading = Boolean(caseId && casePuzzleRows === undefined);

  const savePuzzleToServer = async () => {
    if (!caseId) {
      toast.error(
        'Buka dari Case Builder setelah menyimpan case, atau tambahkan ?caseId=… / ?caseUuid=… di URL.',
      );
      return;
    }
    const correctAnswer =
      answers.find((item) => item.correct)?.text?.trim() ?? '';
    if (!correctAnswer) {
      toast.error('Tandai satu jawaban benar.');
      return;
    }
    const loadingId = toast.loading('Menyimpan puzzle…');
    try {
      await createPuzzle(caseId, {
        question: question.trim(),
        answer: correctAnswer,
        explanation: clueText.trim(),
      });
      toast.dismiss(loadingId);
      toast.success('Puzzle tersimpan di server');
      const data = await listPuzzles(caseId);
      const list = data?.puzzles ?? [];
      setCasePuzzleRows(
        list.map((p, i) => ({
          id: p.id,
          question: p.question,
          type: 'Puzzle',
          points: 50,
          theme: [
            'from-purple-100 to-purple-50 border-purple-200',
            'from-blue-100 to-blue-50 border-blue-200',
            'from-pink-100 to-pink-50 border-pink-200',
          ][i % 3],
        })),
      );
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    }
  };

  const showBackTo = classCodeFromQuery
    ? `/teacher/classes/${encodeURIComponent(classCodeFromQuery)}`
    : '/teacher/case-builder';
  const backLabel = classCodeFromQuery ? 'Detail kelas' : 'Case Builder';

  return (
    <div className='min-h-screen bg-white'>
      <TeacherTopBar
        title={caseId ? `Puzzle · case ${caseId}` : 'Puzzle Builder'}
        showBackTo={showBackTo}
        backLabel={backLabel}
        actionsRight={
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Button
              variant='outline'
              className='rounded-full'
              size='sm'
              type='button'
            >
              <Eye className='mr-2 h-4 w-4' />
              Preview
            </Button>
            <Button
              onClick={savePuzzleToServer}
              className='rounded-full bg-linear-to-r from-green-200 to-emerald-200 text-emerald-800'
              size='sm'
              type='button'
            >
              <CloudUpload className='mr-2 h-4 w-4' />
              Simpan Puzzle
            </Button>
          </div>
        }
      />

      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <div className='grid lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2 space-y-6'>
            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-8 space-y-6'>
                <h2 className='text-2xl font-bold text-gray-900'>
                  Puzzle Configuration
                </h2>
                <div className='space-y-2'>
                  <Label>Puzzle Type</Label>
                  <Select value={puzzleType} onValueChange={setPuzzleType}>
                    <SelectTrigger className='bg-gray-50'>
                      <SelectValue placeholder='Select puzzle type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='Multiple Choice'>
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value='True/False'>True/False</SelectItem>
                      <SelectItem value='Fill in the Blank'>
                        Fill in the Blank
                      </SelectItem>
                      <SelectItem value='Matching'>Matching</SelectItem>
                      <SelectItem value='Ordering'>Ordering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>Question</Label>
                  <textarea
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 resize-none'
                  />
                </div>
                <div className='grid sm:grid-cols-3 gap-4'>
                  <div className='space-y-2'>
                    <Label>Points</Label>
                    <Input
                      type='number'
                      defaultValue='50'
                      className='bg-gray-50'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Difficulty</Label>
                    <Select defaultValue='easy'>
                      <SelectTrigger className='bg-gray-50'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='easy'>Easy</SelectItem>
                        <SelectItem value='medium'>Medium</SelectItem>
                        <SelectItem value='hard'>Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label>Time (min)</Label>
                    <Input
                      type='number'
                      defaultValue='5'
                      className='bg-gray-50'
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label>Clue Generated</Label>
                  <textarea
                    rows={2}
                    value={clueText}
                    onChange={(e) => setClueText(e.target.value)}
                    className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 resize-none'
                    placeholder='Clue revealed when student solves this puzzle...'
                  />
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100 shadow-sm'>
              <CardContent className='p-8'>
                <div className='flex items-center justify-between mb-6'>
                  <div className='flex items-center gap-3'>
                    <div className='w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm'>
                      <Target className='w-6 h-6 text-purple-600' />
                    </div>
                    <h2 className='text-2xl font-bold text-gray-900'>
                      Answer Options
                    </h2>
                  </div>
                  <Button variant='secondary' className='rounded-full'>
                    <Plus className='w-4 h-4 mr-2' />
                    Add Option
                  </Button>
                </div>

                <div className='space-y-3'>
                  {answers.map((answer, index) => (
                    <div
                      key={index}
                      className='flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200'
                    >
                      <Input
                        value={answer.text}
                        onChange={(e) => {
                          const copy = [...answers];
                          copy[index].text = e.target.value;
                          setAnswers(copy);
                        }}
                        className='bg-gray-50'
                      />
                      <Button
                        size='icon'
                        variant={answer.correct ? 'default' : 'outline'}
                        className={
                          answer.correct
                            ? 'bg-green-100 text-green-700 hover:text-green-700'
                            : ''
                        }
                        onClick={() => {
                          setAnswers((prev) =>
                            prev.map((item, i) => ({
                              ...item,
                              correct: i === index,
                            })),
                          );
                        }}
                      >
                        <Check className='w-5 h-5' />
                      </Button>
                      <Button
                        size='icon'
                        variant='outline'
                        className='text-red-600 hover:text-red-700'
                      >
                        <Trash2 className='w-5 h-5' />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 inline-flex items-center gap-2'>
                  <Lightbulb className='w-4 h-4' />
                  Click the check icon to mark the correct answer.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='space-y-6'>
            <Card className='rounded-3xl border border-blue-200 bg-linear-to-br from-blue-100 to-purple-100 shadow-sm'>
              <CardContent className='p-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-4'>
                  Live Preview
                </h3>
                <div className='bg-white rounded-2xl p-6 border border-gray-200'>
                  <p className='text-sm text-gray-600 mb-2'>Question</p>
                  <p className='text-lg font-bold text-gray-900 mb-6'>
                    {question}
                  </p>
                  <div className='grid grid-cols-2 gap-2'>
                    {answers.map((answer, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-xl border-2 text-center font-semibold ${answer.correct ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                      >
                        {answer.text}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-4'>
                  Recent Puzzles
                </h3>
                <div className='space-y-3'>
                  {listLoading ? (
                    <p className='text-sm text-gray-500'>
                      Memuat daftar puzzle…
                    </p>
                  ) : caseId &&
                    Array.isArray(casePuzzleRows) &&
                    casePuzzleRows.length === 0 ? (
                    <p className='text-sm text-gray-500'>
                      Belum ada puzzle untuk case ini.
                    </p>
                  ) : (
                    (caseId ? casePuzzleRows : demoRecent).map((puzzle) => (
                      <div
                        key={puzzle.id}
                        className={`p-4 rounded-xl border bg-linear-to-br ${puzzle.theme}`}
                      >
                        <p className='font-semibold text-gray-900 text-sm mb-2 line-clamp-1'>
                          {puzzle.question}
                        </p>
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-gray-600'>{puzzle.type}</span>
                          <span className='font-bold text-gray-900'>
                            {puzzle.points} pts
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100 shadow-sm'>
              <CardContent className='p-6'>
                <h3 className='text-lg font-bold text-gray-900 mb-3'>
                  Publish Readiness
                </h3>
                <div className='space-y-2 text-sm mb-4'>
                  <p
                    className={
                      question.trim().length > 8
                        ? 'text-gray-800'
                        : 'text-gray-500'
                    }
                  >
                    - Question is filled
                  </p>
                  <p
                    className={
                      answers.some((a) => a.correct)
                        ? 'text-gray-800'
                        : 'text-gray-500'
                    }
                  >
                    - Correct answer is selected
                  </p>
                  <p
                    className={
                      clueText.trim().length > 6
                        ? 'text-gray-800'
                        : 'text-gray-500'
                    }
                  >
                    - Clue output is defined
                  </p>
                </div>
                <Button
                  type='button'
                  onClick={savePuzzleToServer}
                  disabled={
                    !caseId ||
                    question.trim().length <= 8 ||
                    !answers.some((a) => a.correct) ||
                    clueText.trim().length <= 6
                  }
                  className='inline-flex w-full items-center justify-center gap-2 bg-linear-to-r from-green-200 to-emerald-200 text-emerald-900 disabled:opacity-50'
                >
                  <CloudUpload className='h-4 w-4' />
                  Simpan Puzzle
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
