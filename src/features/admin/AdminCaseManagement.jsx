import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle, Clock, Eye, Filter, Pencil, Search, Trash2, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAdminCases } from '@/lib/api/admin';

const EMOJI = ['🔢', '📐', '📏', '🧮', '🔍', '∞', '🎯'];

function capitalizeDifficulty(d) {
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export default function AdminCaseManagement() {
  const [cases, setCases] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    fetchAdminCases({ page_size: 200 })
      .then((data) => {
        if (cancelled || !data?.cases) return;
        const mapped = data.cases.map((c, i) => ({
          id: c.id,
          title: c.title,
          difficulty: capitalizeDifficulty(c.difficulty),
          teacher: c.created_by_name || '—',
          puzzles: c.puzzle_count ?? 0,
          status: c.is_deleted ? 'Archived' : 'Active',
          icon: EMOJI[i % EMOJI.length],
          color: ['blue', 'purple', 'pink', 'yellow', 'green'][i % 5],
          completions: 0,
        }));
        setCases(mapped);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Gagal memuat cases');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const keyword = search.trim().toLowerCase();
      const matchKeyword =
        keyword.length === 0 ||
        c.title.toLowerCase().includes(keyword) ||
        c.teacher.toLowerCase().includes(keyword);
      const matchDifficulty = difficultyFilter === 'all' || c.difficulty.toLowerCase() === difficultyFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.status === 'Active') ||
        (statusFilter === 'archived' && c.status === 'Archived');
      return matchKeyword && matchDifficulty && matchStatus;
    });
  }, [search, difficultyFilter, statusFilter, cases]);

  const summary = {
    totalCases: cases.length,
    active: cases.filter((c) => c.status === 'Active').length,
    archived: cases.filter((c) => c.status === 'Archived').length,
    completions: cases.reduce((sum, c) => sum + c.completions, 0),
  };

  const colorThemes = {
    blue: 'from-blue-100 to-blue-50 border-blue-200',
    purple: 'from-purple-100 to-purple-50 border-purple-200',
    pink: 'from-pink-100 to-pink-50 border-pink-200',
    yellow: 'from-yellow-100 to-yellow-50 border-yellow-200',
    green: 'from-green-100 to-green-50 border-green-200',
  };

  return (
    <>
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
        {loadError ? (
          <p className='text-sm text-red-600' role='alert'>
            {loadError}
          </p>
        ) : null}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {[
            { label: 'Total Cases', value: summary.totalCases, icon: BookOpen, cardClass: 'from-purple-100 to-purple-50 border-purple-200 text-purple-600' },
            { label: 'Active', value: summary.active, icon: CheckCircle, cardClass: 'from-green-100 to-green-50 border-green-200 text-green-600' },
            { label: 'Archived', value: summary.archived, icon: Clock, cardClass: 'from-yellow-100 to-yellow-50 border-yellow-200 text-yellow-600' },
            { label: 'Completions (UI)', value: summary.completions, icon: Users, cardClass: 'from-blue-100 to-blue-50 border-blue-200 text-blue-600' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className={`rounded-2xl border bg-linear-to-br ${stat.cardClass}`}>
                <CardContent className='p-5'>
                  <Icon className='w-5 h-5 mb-2' />
                  <div className='text-2xl font-bold text-gray-900'>{stat.value}</div>
                  <p className='text-xs text-gray-600'>{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className='p-4'>
            <div className='flex flex-col lg:flex-row lg:items-center gap-3'>
              <div className='relative flex-1'>
                <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
                <Input
                  className='pl-9'
                  placeholder='Search cases...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className='w-full sm:w-44 bg-gray-50'>
                  <SelectValue placeholder='Difficulty' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Difficulty</SelectItem>
                  <SelectItem value='easy'>Easy</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='hard'>Hard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-full sm:w-44 bg-gray-50'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='archived'>Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant='outline' size='icon' type='button'>
                <Filter className='w-4 h-4' />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {filteredCases.map((c) => (
            <Card
              key={c.id}
              className={`rounded-3xl border bg-linear-to-br shadow-sm hover:shadow-md transition-all ${colorThemes[c.color] ?? colorThemes.purple}`}
            >
              <CardContent className='p-6 space-y-4'>
                <div className='flex items-start justify-between'>
                  <div className='w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm'>
                    {c.icon}
                  </div>
                  <Badge
                    className={
                      c.status === 'Active'
                        ? 'bg-green-100 text-green-700 border-transparent'
                        : 'bg-gray-100 text-gray-700 border-transparent'
                    }
                  >
                    {c.status}
                  </Badge>
                </div>

                <h3 className='text-lg font-bold text-gray-900'>{c.title}</h3>

                <div className='space-y-2 text-sm'>
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600'>Difficulty</span>
                    <Badge
                      className={
                        c.difficulty === 'Easy'
                          ? 'bg-green-100 text-green-700 border-transparent'
                          : c.difficulty === 'Medium'
                            ? 'bg-blue-100 text-blue-700 border-transparent'
                            : 'bg-red-100 text-red-700 border-transparent'
                      }
                    >
                      {c.difficulty}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600'>Created by</span>
                    <span className='font-semibold text-gray-900'>{c.teacher}</span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600'>Puzzles</span>
                    <span className='font-semibold text-gray-900'>{c.puzzles} stages</span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600'>Completions</span>
                    <span className='font-semibold text-gray-900'>{c.completions}</span>
                  </div>
                </div>

                <div className='grid grid-cols-3 gap-2 pt-1'>
                  <Button size='icon' variant='outline' type='button'><Eye className='w-4 h-4' /></Button>
                  <Button size='icon' variant='outline' type='button'><Pencil className='w-4 h-4' /></Button>
                  <Button size='icon' variant='outline' type='button'><Trash2 className='w-4 h-4' /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {filteredCases.length === 0 ? (
          <Card>
            <CardContent className='p-6 text-center text-sm text-gray-500'>
              No cases found with current filters.
            </CardContent>
          </Card>
        ) : null}
      </main>
    </>
  );
}
