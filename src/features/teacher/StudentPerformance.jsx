import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, Target, TrendingUp, Trophy, Users } from 'lucide-react';

import { StatCardsRowSkeleton } from '@/components/common/page-skeletons';
import { TeacherTopBar } from '@/components/teacher/teacher-top-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { fetchAdminClasses } from '@/lib/api/admin';

export default function StudentPerformance() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAdminClasses({ page_size: 500 })
      .then((d) => {
        if (!cancelled) setClasses(d?.classes ?? []);
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const students = classes.reduce((s, c) => s + (c.student_count || 0), 0);
    const avg = classes.length ? Math.round(classes.reduce((s, c) => s + (c.average_score || 0), 0) / classes.length) : 0;
    const cases = classes.reduce((s, c) => s + (c.case_count || 0), 0);
    const puzzles = classes.reduce((s, c) => s + (c.puzzle_count || 0), 0);
    return { students, avg, cases, puzzles };
  }, [classes]);

  return (
    <div className='min-h-screen bg-white'>
      <TeacherTopBar title='Student Performance' showBackTo='/teacher' backLabel='Dashboard' />

      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <div className='mb-8'>
          {loading ? (
            <StatCardsRowSkeleton count={4} />
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {[
              { label: 'Total Students', value: stats.students, icon: Users, percent: 100, theme: 'from-green-100 to-green-50 border-green-200 text-green-600' },
              { label: 'Average Accuracy', value: `${stats.avg}%`, icon: Target, percent: stats.avg, theme: 'from-blue-100 to-blue-50 border-blue-200 text-blue-600' },
              { label: 'Total Cases', value: stats.cases, icon: Trophy, percent: 100, theme: 'from-yellow-100 to-yellow-50 border-yellow-200 text-yellow-600' },
              { label: 'Total Puzzles', value: stats.puzzles, icon: TrendingUp, percent: 100, theme: 'from-purple-100 to-purple-50 border-purple-200 text-purple-600' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className={`rounded-2xl border bg-linear-to-br p-6 shadow-sm ${item.theme}`}>
                  <CardContent className='p-0'>
                    <div className='mb-4 flex items-center justify-between'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm'>
                        <Icon className='h-6 w-6' />
                      </div>
                      <CheckCircle className='h-5 w-5 text-green-500' />
                    </div>
                    <div className='mb-1 text-3xl font-bold text-gray-900'>{item.value}</div>
                    <div className='mb-3 text-sm text-gray-600'>{item.label}</div>
                    <Progress value={item.percent} />
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </div>

        <Card className='rounded-3xl border border-gray-200 shadow-sm'>
          <CardContent className='p-0'>
            <div className='border-b border-gray-200 p-6'>
              <h3 className='text-2xl font-bold text-gray-900'>Class Performance (API)</h3>
            </div>
            <div className='divide-y divide-gray-100'>
              {loading ? (
                <div className='space-y-0 p-6'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className='mb-4 h-28 w-full rounded-xl last:mb-0' />
                  ))}
                </div>
              ) : null}
              {!loading ? classes.map((item) => (
                <div key={item.id} className='p-6 hover:bg-gray-50'>
                  <div className='mb-3 flex items-center justify-between'>
                    <h4 className='font-bold text-gray-900'>{item.name}</h4>
                    <span className='inline-flex items-center gap-1 font-bold text-yellow-600'>
                      <Trophy className='h-4 w-4' />
                      {item.average_score || 0}%
                    </span>
                  </div>
                  <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                    <div>
                      <p className='mb-1 text-sm text-gray-600'>Mode</p>
                      <p className='text-sm font-bold text-gray-900'>
                        {item.work_mode === 'group' ? 'Kelompok' : 'Individu'}
                      </p>
                    </div>
                    <div>
                      <p className='mb-1 text-sm text-gray-600'>Students</p>
                      <p className='text-sm font-bold text-gray-900'>{item.student_count || 0}</p>
                    </div>
                    <div>
                      <p className='mb-1 text-sm text-gray-600'>Cases / Puzzles</p>
                      <p className='inline-flex items-center gap-2 text-sm font-bold text-gray-900'>
                        <Clock className='h-4 w-4 text-gray-400' />
                        {item.case_count || 0} / {item.puzzle_count || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )) : null}
              {!loading && classes.length === 0 ? (
                <p className='p-6 text-sm text-gray-500'>Belum ada data kelas.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
