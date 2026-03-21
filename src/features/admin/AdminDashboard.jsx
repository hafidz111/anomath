import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Target, Trophy, Users, Zap } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchAdminStats } from '@/lib/api/admin';

const statTheme = {
  purple: {
    card: 'bg-linear-to-br from-purple-100 to-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
  },
  blue: {
    card: 'bg-linear-to-br from-blue-100 to-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
  },
  green: {
    card: 'bg-linear-to-br from-green-100 to-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
  },
  yellow: {
    card: 'bg-linear-to-br from-yellow-100 to-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
  },
  pink: {
    card: 'bg-linear-to-br from-pink-100 to-pink-50',
    border: 'border-pink-200',
    icon: 'text-pink-600',
  },
};

function formatNum(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString();
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e) => {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : 'Gagal memuat statistik',
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const platformStats = stats
    ? {
        totalUsers: stats.total_users,
        totalTeachers: stats.teachers,
        totalCases: stats.total_cases,
        totalPuzzles: stats.total_puzzles,
      }
    : null;

  const analyticsCards = stats
    ? [
        {
          label: 'Daily Active Users',
          value: '—',
          change: '—',
          color: 'purple',
          icon: Activity,
        },
        {
          label: 'Cases Completed (sessions)',
          value: formatNum(stats.completed_sessions),
          change: 'live',
          color: 'blue',
          icon: Trophy,
        },
        {
          label: 'Students',
          value: formatNum(stats.students),
          change: 'live',
          color: 'green',
          icon: Target,
        },
        {
          label: 'Admins',
          value: formatNum(stats.admins),
          change: 'live',
          color: 'yellow',
          icon: Zap,
        },
      ]
    : [];

  const systemStatus = [
    {
      label: 'API stats',
      value: loadError ? 'Error' : stats ? 'Loaded' : 'Loading…',
      color: loadError ? 'yellow' : 'green',
    },
    {
      label: 'Total cases (incl. archived)',
      value: stats ? String(stats.total_cases_all) : '—',
      color: 'green',
    },
    { label: 'Database', value: 'SQLite', color: 'green' },
    { label: 'Backend', value: 'Django REST', color: 'green' },
  ];

  return (
    <>
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {loadError ? (
          <p className='text-sm text-red-600 mb-4' role='alert'>
            {loadError}
          </p>
        ) : null}
        {/* Summary Cards */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {[
            {
              label: 'Total Users',
              value: platformStats ? formatNum(platformStats.totalUsers) : '…',
              icon: Users,
              color: 'purple',
            },
            {
              label: 'Total Teachers',
              value: platformStats
                ? formatNum(platformStats.totalTeachers)
                : '…',
              icon: Users,
              color: 'blue',
            },
            {
              label: 'Total Cases',
              value: platformStats ? formatNum(platformStats.totalCases) : '…',
              icon: Target,
              color: 'pink',
            },
            {
              label: 'Total Puzzles',
              value: platformStats
                ? formatNum(platformStats.totalPuzzles)
                : '…',
              icon: Trophy,
              color: 'yellow',
            },
          ].map((s) => {
            const theme = statTheme[s.color];
            const Icon = s.icon;
            return (
              <Card
                key={s.label}
                className={`rounded-2xl border ${theme.border} shadow-sm ${theme.card}`}
              >
                <CardContent className='p-6'>
                  <div className='w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center shadow-sm'>
                    <Icon className={`w-6 h-6 ${theme.icon}`} />
                  </div>
                  <div className='text-3xl font-bold text-gray-900 mt-3 mb-1'>
                    {s.value}
                  </div>
                  <div className='text-sm text-gray-700'>{s.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Analytics + System Health */}
        <div className='grid lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2'>
            <div className='grid sm:grid-cols-2 gap-4'>
              {analyticsCards.map((c) => {
                const theme = statTheme[c.color];
                const Icon = c.icon;
                return (
                  <Card
                    key={c.label}
                    className='rounded-2xl border border-gray-200 shadow-sm'
                  >
                    <CardContent className='p-6'>
                      <div className='flex items-center justify-between mb-3'>
                        <div
                          className={`w-10 h-10 rounded-lg ${theme.card} border ${theme.border} flex items-center justify-center`}
                        >
                          <Icon className={`w-5 h-5 ${theme.icon}`} />
                        </div>
                        <span className='text-xs font-bold text-green-600'>
                          {c.change}
                        </span>
                      </div>
                      <div className='text-2xl font-bold text-gray-900 mb-1'>
                        {c.value}
                      </div>
                      <div className='text-sm text-gray-600'>{c.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-6'>
                <h2 className='text-xl font-bold text-gray-900 mb-4'>
                  System Status
                </h2>
                <div className='space-y-3'>
                  {systemStatus.map((s) => (
                    <div
                      key={s.label}
                      className='flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100'
                    >
                      <span className='text-sm text-gray-600'>{s.label}</span>
                      <span
                        className={`text-sm font-bold ${statTheme[s.color]?.icon ?? 'text-green-600'}`}
                      >
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className='mt-5'>
                  <Button
                    variant='secondary'
                    className='w-full'
                    type='button'
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {[
            { label: 'Manage Users', to: '/admin/users' },
            { label: 'Kelas', to: '/admin/classes' },
            { label: 'Review kelas publik', to: '/admin/class-review' },
            { label: 'Leaderboard', to: '/admin/leaderboard' },
          ].map((item) => (
            <Button key={item.to} asChild variant='outline'>
              <Link to={item.to}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </main>
    </>
  );
}
