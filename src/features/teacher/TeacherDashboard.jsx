import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle, Puzzle, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '@/components/common/empty-state';
import { TeacherTopBar } from '@/components/teacher/teacher-top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { fetchMe } from '@/lib/api/auth';
import { listCases } from '@/lib/api/cases';
import { fetchAdminClasses } from '@/lib/api/admin';
import { fetchTeacherDashboard } from '@/lib/api/teacher';

const statTheme = {
  purple: 'from-purple-100 to-purple-50 border-purple-200 text-purple-600',
  yellow: 'from-yellow-100 to-yellow-50 border-yellow-200 text-yellow-600',
  blue: 'from-blue-100 to-blue-50 border-blue-200 text-blue-600',
  green: 'from-green-100 to-green-50 border-green-200 text-green-600',
};

const AVATAR_FALLBACK = ['👩', '👨', '👧', '👦', '🧑'];

/** Fallback agar grafik mingguan selalu punya titik (Recharts + data kosak = tampilan hilang). */
const EMPTY_WEEKLY = [
  { week: 'Week 1', completed: 0, accuracy: 0 },
  { week: 'Week 2', completed: 0, accuracy: 0 },
  { week: 'Week 3', completed: 0, accuracy: 0 },
  { week: 'Week 4', completed: 0, accuracy: 0 },
];

export default function TeacherDashboard() {
  const [myCases, setMyCases] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [apiError, setApiError] = useState(null);
  /** Gagal fetch /api/teacher/dashboard/ — tidak memblokir kelas/case di atas. */
  const [dashboardError, setDashboardError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await fetchMe();
        const [casesData, classesData] = await Promise.all([
          listCases({ page_size: 200 }),
          fetchAdminClasses({ page_size: 200 }),
        ]);
        if (cancelled) return;
        const cases = casesData?.cases ?? [];
        setMyCases(cases.filter((c) => String(c.created_by) === String(me.id)));
        setMyClasses(classesData?.classes ?? []);
        setApiError(null);
        setDashboardError(null);
        try {
          const dashData = await fetchTeacherDashboard();
          if (!cancelled) {
            setDashboard(dashData ?? null);
            setDashboardError(null);
          }
        } catch (dashErr) {
          if (!cancelled) {
            setDashboard(null);
            setDashboardError(
              dashErr instanceof Error ? dashErr.message : 'Gagal memuat analitik dashboard guru',
            );
          }
        }
      } catch (e) {
        if (!cancelled) setApiError(e instanceof Error ? e.message : 'Gagal memuat data dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const overview = useMemo(() => {
    const totalStudents = myClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);
    const avgScore = myClasses.length
      ? Math.round(myClasses.reduce((sum, c) => sum + (c.average_score || 0), 0) / myClasses.length)
      : 0;
    const totalPuzzles = myClasses.reduce((sum, c) => sum + (c.puzzle_count || 0), 0);
    return { totalStudents, avgScore, totalPuzzles, classCount: myClasses.length };
  }, [myClasses]);

  const students = useMemo(() => {
    const rows = dashboard?.top_students ?? [];
    return rows.map((s, i) => ({
      ...s,
      avatar: AVATAR_FALLBACK[i % AVATAR_FALLBACK.length],
    }));
  }, [dashboard]);

  const weeklyProgress = useMemo(() => {
    const w = dashboard?.weekly_progress;
    if (Array.isArray(w) && w.length > 0) return w;
    return EMPTY_WEEKLY;
  }, [dashboard]);

  const quickStats = dashboard?.quick_stats;
  const analytics = dashboard?.analytics;

  /** Ringkas dari kelas bila API dashboard gagal — supaya Quick Stats / rasio tidak semua "—". */
  const fallbackTotalStudents = overview.totalStudents;
  const fallbackActiveRatio =
    fallbackTotalStudents > 0
      ? `0/${fallbackTotalStudents}`
      : '—';

  const hasDashboard = Boolean(dashboard);

  const leaderboardRows = dashboard?.leaderboard?.length
    ? dashboard.leaderboard.map((p, idx) => ({
        ...p,
        avatar: AVATAR_FALLBACK[idx % AVATAR_FALLBACK.length],
      }))
    : students;

  return (
    <div className='min-h-screen bg-white'>
      <TeacherTopBar title='Teacher Dashboard' />

      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        {apiError ? (
          <p className='mb-6 inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
            {apiError}
          </p>
        ) : null}
        {dashboardError && !apiError ? (
          <p className='mb-6 inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
            Analitik (performa siswa, grafik minggu, leaderboard): {dashboardError} — kelas & case di atas tetap
            dimuat.
          </p>
        ) : null}

        <div className='mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {[
            {
              label: 'Total Students',
              value: loading ? '…' : overview.totalStudents,
              icon: Users,
              color: 'purple',
            },
            {
              label: 'Average Score',
              value: loading ? '…' : `${overview.avgScore}%`,
              icon: Trophy,
              color: 'yellow',
            },
            {
              label: 'My Cases',
              value: loading ? '…' : myCases.length,
              icon: CheckCircle,
              color: 'blue',
            },
            {
              label: 'Total Puzzles',
              value: loading ? '…' : overview.totalPuzzles,
              icon: TrendingUp,
              color: 'green',
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className={`rounded-2xl border bg-linear-to-br p-6 shadow-sm ${statTheme[stat.color]}`}>
                <CardContent className='p-0'>
                  <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm'>
                    <Icon className='h-6 w-6' />
                  </div>
                  <div className='mb-1 text-3xl font-bold text-gray-900'>{stat.value}</div>
                  <div className='text-sm text-gray-600'>{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className='mb-8 flex flex-wrap gap-3'>
          <Button asChild className='rounded-full bg-linear-to-r from-purple-200 to-blue-200 text-purple-700'>
            <Link to='/teacher/classes'>Manage Classes</Link>
          </Button>
          <Button variant='outline' className='rounded-full' asChild>
            <Link to='/teacher/classes?create=1'>Create New Class</Link>
          </Button>
        </div>

        <div className='grid gap-8 lg:grid-cols-2 mb-8'>
          <Card className='rounded-3xl border border-gray-200 shadow-sm'>
            <CardContent className='p-6'>
              <h2 className='mb-4 text-2xl font-bold text-gray-900'>My Classes</h2>
              <div className='space-y-3'>
                {loading ? (
                  <EmptyState title='…' />
                ) : myClasses.length === 0 ? (
                  <EmptyState title='Tidak ada kelas'>
                    <Button asChild size='sm' variant='outline' className='rounded-full'>
                      <Link to='/teacher/classes?create=1'>Buat kelas</Link>
                    </Button>
                  </EmptyState>
                ) : (
                  myClasses.map((cls) => (
                    <div key={cls.id} className='rounded-xl border border-gray-200 p-4'>
                      <div className='mb-1 font-semibold text-gray-900'>{cls.name}</div>
                      <div className='mb-2 text-sm text-gray-600'>
                        Grade {cls.grade ?? '-'} • {cls.work_mode === 'group' ? 'Kelompok' : 'Individu'} •{' '}
                        {cls.student_count || 0} students • {cls.case_count || 0} cases
                      </div>
                      <div className='flex items-center gap-2'>
                        <Progress value={cls.average_score || 0} />
                        <span className='min-w-12 text-right text-sm font-bold text-gray-900'>
                          {cls.average_score || 0}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-3xl border border-gray-200 shadow-sm'>
            <CardContent className='p-6'>
              <h2 className='mb-4 text-2xl font-bold text-gray-900'>My Cases</h2>
              <div className='space-y-3'>
                {loading ? (
                  <EmptyState title='…' />
                ) : myCases.length === 0 ? (
                  <EmptyState title='Tidak ada case'>
                    <Button asChild size='sm' variant='outline' className='rounded-full'>
                      <Link to='/teacher/case-builder'>Case builder</Link>
                    </Button>
                  </EmptyState>
                ) : (
                  myCases.map((c) => (
                    <div key={c.id} className='rounded-xl border border-gray-200 p-4'>
                      <div className='font-semibold text-gray-900'>{c.title}</div>
                      <div className='text-sm text-gray-600'>
                        {c.difficulty} • {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='grid lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2 space-y-8'>
            <Card className='rounded-3xl border border-gray-200 shadow-sm overflow-hidden'>
              <div className='bg-linear-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200'>
                <div className='grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700'>
                  <div className='col-span-5'>Student Performance</div>
                  <div className='col-span-2 text-center'>Score</div>
                  <div className='col-span-2 text-center'>Solved</div>
                  <div className='col-span-3 text-center'>Accuracy</div>
                </div>
              </div>
              <CardContent className='min-h-[200px] p-6'>
                {loading ? (
                  <EmptyState title='…' />
                ) : students.length === 0 ? (
                  <EmptyState title={dashboardError ? 'Gagal memuat' : 'Tidak ada data'} />
                ) : (
                  <div className='space-y-3'>
                    {students.map((s) => (
                      <div
                        key={s.user_id}
                        className='grid grid-cols-12 gap-4 items-center px-2 py-3 hover:bg-gray-50 rounded-xl transition-colors'
                      >
                        <div className='col-span-5 flex items-center gap-3'>
                          <div className='w-10 h-10 rounded-full bg-linear-to-br from-purple-200 to-blue-200 flex items-center justify-center text-xl'>
                            {s.avatar}
                          </div>
                          <span className='font-semibold text-gray-900'>{s.name}</span>
                        </div>
                        <div className='col-span-2 text-center font-semibold text-gray-900'>
                          {(s.score ?? 0).toLocaleString()}
                        </div>
                        <div className='col-span-2 text-center text-sm text-gray-700'>{s.solved ?? 0}</div>
                        <div className='col-span-3 flex items-center gap-2'>
                          <Progress value={s.accuracy ?? 0} />
                          <span className='text-xs font-bold text-gray-900 min-w-10 text-right'>
                            {s.accuracy ?? 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-6'>
                <h2 className='text-2xl font-bold text-gray-900 mb-4'>Analytics</h2>
                <h3 className='text-lg font-semibold text-gray-800 mb-3'>Weekly Progress</h3>
                <div className='relative min-h-[280px] rounded-2xl border border-gray-200 p-3'>
                  <ResponsiveContainer width='100%' height={280}>
                    <LineChart data={weeklyProgress}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#E5E7EB' />
                      <XAxis dataKey='week' stroke='#6B7280' />
                      <YAxis stroke='#6B7280' />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '12px',
                          padding: '10px',
                        }}
                      />
                      <Legend verticalAlign='bottom' height={36} />
                      <Line
                        type='monotone'
                        dataKey='completed'
                        stroke='#A78BFA'
                        strokeWidth={3}
                        dot={{ fill: '#A78BFA', r: 4 }}
                        name='Cases Completed'
                      />
                      <Line
                        type='monotone'
                        dataKey='accuracy'
                        stroke='#60A5FA'
                        strokeWidth={3}
                        dot={{ fill: '#60A5FA', r: 4 }}
                        name='Accuracy %'
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className='grid sm:grid-cols-3 gap-4 mt-6'>
                  {[
                    {
                      label: 'Avg Completion Time',
                      value: loading
                        ? '…'
                        : analytics?.avg_completion_minutes != null
                          ? `${analytics.avg_completion_minutes} min`
                          : '—',
                      hint: null,
                      icon: Target,
                      color: 'purple',
                    },
                    {
                      label: 'Success Rate',
                      value: loading
                        ? '…'
                        : hasDashboard
                          ? `${analytics?.success_rate_percent ?? 0}%`
                          : dashboardError
                            ? '—'
                            : '—',
                      hint: null,
                      icon: CheckCircle,
                      color: 'green',
                    },
                    {
                      label: 'Active This Week',
                      value: loading
                        ? '…'
                        : hasDashboard
                          ? `${analytics?.active_students_this_week ?? 0}/${Math.max(
                              analytics?.total_students_in_classes || 0,
                              analytics?.active_students_this_week ?? 0,
                            )}`
                          : dashboardError
                            ? fallbackActiveRatio
                            : '—',
                      hint: null,
                      icon: TrendingUp,
                      color: 'blue',
                    },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.label} className={`bg-linear-to-br rounded-2xl p-4 border ${statTheme[stat.color]}`}>
                        <CardContent className='p-0'>
                          <div className='flex items-center gap-2 mb-2'>
                            <Icon className='w-5 h-5' />
                            <span className='text-sm text-gray-600'>{stat.label}</span>
                          </div>
                          <div className='text-2xl font-bold text-gray-900'>{stat.value}</div>
                          {stat.hint ? <p className='mt-1 text-xs text-gray-500'>{stat.hint}</p> : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='space-y-8'>
            <Card className='rounded-3xl border border-gray-200 shadow-sm p-6'>
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-xl font-bold text-gray-900'>Class Leaderboard</h3>
                <Link to='/teacher/performance' className='text-purple-600 hover:text-purple-700 font-semibold text-sm'>View all →</Link>
              </div>
              <div className='min-h-[120px] space-y-3'>
                {loading ? (
                  <EmptyState title='Memuat leaderboard…' />
                ) : leaderboardRows.length === 0 ? (
                  <EmptyState title='Kosong' />
                ) : (
                  leaderboardRows.map((p, idx) => (
                    <div key={p.user_id} className='flex items-center gap-3 p-3 bg-gray-50 rounded-xl'>
                      <div className='w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-gray-700'>
                        {idx + 1}
                      </div>
                      <div className='w-10 h-10 rounded-full bg-linear-to-br from-purple-200 to-blue-200 flex items-center justify-center text-xl'>
                        {p.avatar ?? AVATAR_FALLBACK[idx % AVATAR_FALLBACK.length]}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='font-semibold truncate text-gray-900'>{p.name}</div>
                        <div className='text-xs text-gray-600'>{(p.score ?? 0).toLocaleString()} pts</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className='rounded-3xl border border-blue-200 shadow-sm bg-linear-to-br from-blue-100 to-purple-100'>
              <CardContent className='p-6'>
                <h3 className='text-xl font-bold text-gray-900 mb-4'>Quick Stats</h3>
                <div className='space-y-3'>
                  {[
                    {
                      label: 'Cases Created',
                      value: loading
                        ? '…'
                        : String(quickStats?.cases_created ?? myCases.length),
                      icon: Puzzle,
                    },
                    {
                      label: 'Total Classes',
                      value: loading
                        ? '…'
                        : String(quickStats?.total_classes ?? overview.classCount),
                      icon: Users,
                    },
                    {
                      label: 'Avg Class Size',
                      value: loading
                        ? '…'
                        : quickStats != null
                          ? String(quickStats.avg_class_size)
                          : overview.classCount > 0
                            ? String(Math.round(overview.totalStudents / overview.classCount))
                            : '0',
                      icon: BarChart3,
                    },
                  ].map((q) => {
                    const Icon = q.icon;
                    return (
                      <div key={q.label} className='flex items-center justify-between bg-white rounded-xl p-3'>
                        <div className='flex items-center gap-2 text-sm text-gray-700'>
                          <Icon className='w-4 h-4 text-blue-600' />
                          {q.label}
                        </div>
                        <span className='font-bold text-gray-900'>{q.value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
