import { useCallback, useRef, useState } from 'react';
import { BookOpen, ChevronDown, GraduationCap, Puzzle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { listPuzzles } from '@/lib/api/cases';
import { cn } from '@/lib/utils';

/**
 * Hierarki: Kelas → Cases → Puzzle (expandable).
 * `casesByClassId`: map id kelas → array case dari API { id, title, puzzle_count?, difficulty? }.
 */
export function ClassCasePuzzleHierarchy({ classes, casesByClassId, emptyHint = 'Belum ada case di kelas ini.' }) {
  const [openClass, setOpenClass] = useState(() => (classes[0]?.id != null ? String(classes[0].id) : null));
  const [openCases, setOpenCases] = useState(() => new Set());
  const [puzzleCache, setPuzzleCache] = useState({});
  const [loadingCase, setLoadingCase] = useState(null);
  const cacheRef = useRef({});
  const inflight = useRef(new Set());

  const loadPuzzles = useCallback(async (caseId) => {
    const key = String(caseId);
    if (cacheRef.current[key] !== undefined || inflight.current.has(key)) return;
    inflight.current.add(key);
    setLoadingCase(caseId);
    try {
      const data = await listPuzzles(caseId);
      const list = data?.puzzles ?? [];
      cacheRef.current[key] = list;
      setPuzzleCache((prev) => ({ ...prev, [key]: list }));
    } catch {
      cacheRef.current[key] = [];
      setPuzzleCache((prev) => ({ ...prev, [key]: [] }));
    } finally {
      inflight.current.delete(key);
      setLoadingCase(null);
    }
  }, []);

  const toggleCase = (caseId) => {
    setOpenCases((prev) => {
      const next = new Set(prev);
      const id = String(caseId);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        loadPuzzles(caseId);
      }
      return next;
    });
  };

  return (
    <div className='space-y-3'>
      {classes.map((cls) => {
        const cid = String(cls.id);
        const cases = casesByClassId[cid] ?? [];
        const classOpen = openClass === cid;
        return (
          <Card key={cid} className='overflow-hidden border-gray-200 shadow-sm'>
            <button
              type='button'
              onClick={() => setOpenClass(classOpen ? null : cid)}
              className='flex w-full items-center justify-between gap-3 bg-linear-to-r from-purple-50 to-blue-50 px-4 py-3 text-left transition-colors hover:from-purple-100/80 hover:to-blue-100/80'
            >
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm'>
                  <GraduationCap className='h-5 w-5 text-purple-600' aria-hidden />
                </div>
                <div className='min-w-0'>
                  <div className='font-semibold text-gray-900 truncate'>{cls.name}</div>
                  <div className='text-xs text-gray-600'>
                    {cases.length} case ·{' '}
                    {cases.reduce((s, c) => s + (Number(c.puzzle_count) || 0), 0)} puzzle
                  </div>
                </div>
              </div>
              <ChevronDown
                className={cn('h-5 w-5 shrink-0 text-gray-500 transition-transform', classOpen && 'rotate-180')}
                aria-hidden
              />
            </button>

            {classOpen ? (
              <CardContent className='space-y-2 border-t border-gray-100 p-4'>
                {cases.length === 0 ? (
                  <p className='text-sm text-gray-500 py-2'>{emptyHint}</p>
                ) : (
                  cases.map((c) => {
                    const caseKey = String(c.id);
                    const expanded = openCases.has(caseKey);
                    const puzzles = puzzleCache[caseKey];
                    return (
                      <div key={caseKey} className='rounded-xl border border-gray-200 bg-white'>
                        <button
                          type='button'
                          onClick={() => toggleCase(c.id)}
                          className='flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50 rounded-xl'
                        >
                          <span className='flex min-w-0 items-center gap-2'>
                            <BookOpen className='h-4 w-4 shrink-0 text-blue-600' aria-hidden />
                            <span className='font-medium text-gray-900 truncate'>{c.title}</span>
                            {c.difficulty ? (
                              <Badge variant='outline' className='shrink-0 text-xs'>
                                {c.difficulty}
                              </Badge>
                            ) : null}
                          </span>
                          <span className='flex shrink-0 items-center gap-2 text-xs text-gray-500'>
                            {c.puzzle_count != null ? `${c.puzzle_count} puzzle` : ''}
                            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                          </span>
                        </button>
                        {expanded ? (
                          <div className='border-t border-gray-100 px-3 py-2 pl-8'>
                            {loadingCase === c.id && puzzles === undefined ? (
                              <div className='space-y-2 py-1'>
                                <Skeleton className='h-3 w-full' />
                                <Skeleton className='h-3 w-5/6' />
                                <Skeleton className='h-3 w-4/6' />
                              </div>
                            ) : null}
                            {puzzles && puzzles.length === 0 ? (
                              <p className='text-xs text-gray-500'>Tidak ada puzzle untuk case ini.</p>
                            ) : null}
                            {puzzles && puzzles.length > 0 ? (
                              <ul className='space-y-1.5'>
                                {puzzles.map((pz) => (
                                  <li
                                    key={pz.id}
                                    className='flex items-start gap-2 rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-800'
                                  >
                                    <Puzzle className='mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-600' aria-hidden />
                                    <span className='line-clamp-2'>{pz.question || `Puzzle #${pz.order ?? pz.id}`}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
