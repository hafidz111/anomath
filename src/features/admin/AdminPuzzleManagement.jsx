import { useEffect, useMemo, useState } from 'react';
import { Eye, Filter, Pencil, Search, Target, Trash2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAdminPuzzles } from '@/lib/api/admin';

function capDiff(d) {
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export default function AdminPuzzleManagement() {
  const [puzzles, setPuzzles] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    fetchAdminPuzzles({ page_size: 500 })
      .then((data) => {
        if (cancelled || !data?.puzzles) return;
        const mapped = data.puzzles.map((p) => ({
          id: p.id,
          question: p.question,
          answer: p.answer != null && String(p.answer).length > 0 ? String(p.answer) : '—',
          topic: 'Case',
          difficulty: capDiff(p.case_difficulty),
          caseName: p.case_title || '—',
        }));
        setPuzzles(mapped);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Gagal memuat puzzle');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPuzzles = useMemo(() => {
    return puzzles.filter((p) => {
      const keyword = search.trim().toLowerCase();
      const matchKeyword =
        keyword.length === 0 ||
        p.question.toLowerCase().includes(keyword) ||
        p.caseName.toLowerCase().includes(keyword);
      const matchDifficulty = difficultyFilter === 'all' || p.difficulty.toLowerCase() === difficultyFilter;
      return matchKeyword && matchDifficulty;
    });
  }, [search, difficultyFilter, puzzles]);

  const summary = {
    total: puzzles.length,
    easy: puzzles.filter((p) => p.difficulty === 'Easy').length,
    medium: puzzles.filter((p) => p.difficulty === 'Medium').length,
    hard: puzzles.filter((p) => p.difficulty === 'Hard').length,
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
            { label: 'Total Puzzles', value: summary.total, cardClass: 'from-purple-100 to-purple-50 border-purple-200 text-purple-600' },
            { label: 'Easy', value: summary.easy, cardClass: 'from-green-100 to-green-50 border-green-200 text-green-600' },
            { label: 'Medium', value: summary.medium, cardClass: 'from-blue-100 to-blue-50 border-blue-200 text-blue-600' },
            { label: 'Hard', value: summary.hard, cardClass: 'from-red-100 to-red-50 border-red-200 text-red-600' },
          ].map((stat) => (
            <Card key={stat.label} className={`rounded-2xl border bg-linear-to-br ${stat.cardClass}`}>
              <CardContent className='p-5'>
                <Target className='w-5 h-5 mb-2' />
                <div className='text-2xl font-bold text-gray-900'>{stat.value}</div>
                <p className='text-xs text-gray-600'>{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className='p-4'>
            <div className='flex flex-col lg:flex-row lg:items-center gap-3'>
              <div className='relative flex-1'>
                <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
                <Input
                  className='pl-9'
                  placeholder='Search puzzles...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className='flex flex-wrap gap-3'>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className='w-40 bg-gray-50'>
                    <SelectValue placeholder='Difficulty' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Difficulty</SelectItem>
                    <SelectItem value='easy'>Easy</SelectItem>
                    <SelectItem value='medium'>Medium</SelectItem>
                    <SelectItem value='hard'>Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant='outline' size='icon' type='button'>
                  <Filter className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPuzzles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className='max-w-[360px] truncate'>{p.question}</TableCell>
                    <TableCell className='text-muted-foreground text-xs' title='Tidak ditampilkan di API'>
                      {p.answer}
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{p.topic}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.difficulty === 'Easy'
                            ? 'bg-green-100 text-green-700 border-transparent'
                            : p.difficulty === 'Medium'
                              ? 'bg-blue-100 text-blue-700 border-transparent'
                              : 'bg-red-100 text-red-700 border-transparent'
                        }
                      >
                        {p.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className='max-w-24 truncate' title={p.caseName}>
                      {p.caseName}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='inline-flex gap-2'>
                        <Button size='icon' variant='outline' type='button'><Eye className='w-4 h-4' /></Button>
                        <Button size='icon' variant='outline' type='button'><Pencil className='w-4 h-4' /></Button>
                        <Button size='icon' variant='outline' type='button'><Trash2 className='w-4 h-4' /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPuzzles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='text-center text-sm text-gray-500 py-6'>
                      No puzzles found with current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className='gradient-pastel-purple border border-purple-200'>
          <CardContent className='p-6 flex items-center gap-3'>
            <Target className='w-5 h-5 text-purple-600' />
            <p className='text-sm text-gray-700'>
              Endpoint admin mengembalikan kunci jawaban; puzzle publik siswa tetap tanpa answer.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
