import { useEffect, useMemo, useState } from 'react';
import { Award, Crown, Medal, Star, Target, Trophy, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  fetchAdminLeaderboard,
  fetchAdminLeaderboardClasses,
  fetchAdminLeaderboardTeams,
} from '@/lib/api/admin';

const TEAM_EMOJI = ['🏆', '🥷', '📐', '⭐', '🎯', '🎓', '🔢', '📊'];

/**
 * Normalizes team leaderboard API:
 * - Preferred: { classes: [{ class_id, name, teams: [...] }] }
 * - Flat: { teams: [{ class_id, class_name?, team_id?, team_name?, name?, total_score, members, rank }] }
 */
function normalizeLeaderboardTeamsByClass(data) {
  if (!data) return [];

  if (Array.isArray(data.classes) && data.classes.length > 0) {
    return data.classes
      .map((c) => {
        const teams = (c.teams ?? [])
          .map((t, i) => ({
            team_id: String(t.team_id ?? t.id ?? `team-${i}`),
            name: t.team_name ?? t.name ?? `Tim ${i + 1}`,
            total_score: Number(t.total_score ?? 0),
            members: t.members ?? t.member_count ?? 0,
            rank: t.rank ?? i + 1,
          }))
          .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
          .map((t, i) => ({ ...t, rank: i + 1 }));
        return {
          class_id: String(c.class_id ?? c.id ?? ''),
          name: c.name ?? c.class_name ?? 'Kelas',
          teams,
        };
      })
      .sort((a, b) => (b.teams[0]?.total_score ?? 0) - (a.teams[0]?.total_score ?? 0));
  }

  const flat = data.teams ?? [];
  if (flat.length === 0) return [];

  const byClass = new Map();
  for (const row of flat) {
    const cid =
      row.class_id != null && String(row.class_id) !== ''
        ? String(row.class_id)
        : `__ungrouped__${row.name ?? row.class_name ?? 'x'}`;
    if (!byClass.has(cid)) {
      byClass.set(cid, {
        class_id: row.class_id ?? cid,
        name: row.class_name ?? row.name ?? 'Kelas',
        teams: [],
      });
    }
    const block = byClass.get(cid);
    block.teams.push({
      team_id: String(row.team_id ?? row.id ?? `${cid}-${block.teams.length}`),
      name: row.team_name ?? row.name ?? `Tim ${block.teams.length + 1}`,
      total_score: Number(row.total_score ?? 0),
      members: row.members ?? row.member_count ?? 0,
      rank: row.rank ?? 0,
    });
  }

  const result = Array.from(byClass.values());
  for (const block of result) {
    block.teams.sort((a, b) => {
      if ((b.total_score ?? 0) !== (a.total_score ?? 0)) {
        return (b.total_score ?? 0) - (a.total_score ?? 0);
      }
      return (a.rank || 999) - (b.rank || 999);
    });
    block.teams = block.teams.map((t, i) => ({ ...t, rank: i + 1 }));
  }
  result.sort((a, b) => {
    const topA = a.teams[0]?.total_score ?? 0;
    const topB = b.teams[0]?.total_score ?? 0;
    return topB - topA;
  });
  return result;
}

export default function AdminLeaderboardMonitoring() {
  const [globalRows, setGlobalRows] = useState([]);
  const [classBlocks, setClassBlocks] = useState([]);
  const [teamByClass, setTeamByClass] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('all');
  /** Filter khusus tab Team Leaderboard (terpisah dari tab Class) */
  const [selectedTeamClassId, setSelectedTeamClassId] = useState('all');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAdminLeaderboard({ limit: 100 }),
      fetchAdminLeaderboardClasses({ limit_per_class: 50 }),
      fetchAdminLeaderboardTeams(),
    ])
      .then(([g, c, t]) => {
        if (cancelled) return;
        setGlobalRows(g?.leaderboard ?? []);
        setClassBlocks(c?.classes ?? []);
        setTeamByClass(normalizeLeaderboardTeamsByClass(t));
        setLoadError(null);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Gagal memuat leaderboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const classOptions = useMemo(() => classBlocks.map((b) => ({ id: b.class_id, name: b.name })), [classBlocks]);

  const flattenedClassRows = useMemo(() => {
    const rows = [];
    for (const block of classBlocks) {
      for (const row of block.leaderboard ?? []) {
        rows.push({
          ...row,
          className: block.name,
          class_id: block.class_id,
        });
      }
    }
    rows.sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0));
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [classBlocks]);

  const filteredClassLeaderboard = useMemo(() => {
    if (selectedClassId === 'all') return flattenedClassRows;
    const block = classBlocks.find((b) => b.class_id === selectedClassId);
    return block?.leaderboard ?? [];
  }, [selectedClassId, classBlocks, flattenedClassRows]);

  /** Opsi kelas untuk filter tim: gabungan daftar kelas + kelas yang hanya muncul di data tim */
  const teamClassFilterOptions = useMemo(() => {
    const map = new Map();
    classOptions.forEach((o) => map.set(String(o.id), o.name));
    teamByClass.forEach((c) => {
      const id = String(c.class_id);
      if (!map.has(id)) map.set(id, c.name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [classOptions, teamByClass]);

  const filteredTeamByClass = useMemo(() => {
    if (selectedTeamClassId === 'all') return teamByClass;
    return teamByClass.filter((c) => String(c.class_id) === String(selectedTeamClassId));
  }, [teamByClass, selectedTeamClassId]);

  const showPodium = globalRows.length >= 3;
  const topThree = globalRows.slice(0, 3);
  const podiumOrder = showPodium ? [topThree[1], topThree[0], topThree[2]] : [];
  const tableRows = showPodium ? globalRows.slice(3) : globalRows;

  return (
    <>
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {loadError ? (
          <p className='text-sm text-red-600 mb-4' role='alert'>
            {loadError}
          </p>
        ) : null}
        {loading ? (
          <p className='text-sm text-gray-600 mb-4'>Memuat leaderboard…</p>
        ) : null}

        <Tabs defaultValue='global' className='space-y-6'>
          <TabsList className='h-auto p-1'>
            <TabsTrigger value='global' className='px-4 py-2'>
              <Trophy className='w-4 h-4 mr-1' />
              Global Leaderboard
            </TabsTrigger>
            <TabsTrigger value='class' className='px-4 py-2'>
              <Users className='w-4 h-4 mr-1' />
              Class Leaderboard
            </TabsTrigger>
            <TabsTrigger value='team' className='px-4 py-2'>
              <Target className='w-4 h-4 mr-1' />
              Team Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value='global' className='space-y-6'>
            <Card className='border border-sky-200 bg-sky-50'>
              <CardContent className='p-4 text-sm text-sky-950'>
                <strong>Global</strong> hanya menghitung skor dari case yang{' '}
                <strong>tidak terikat kelas</strong> atau terikat minimal satu kelas ber-mode{' '}
                <strong>Individu</strong>. Progres pada case yang hanya dipakai di kelas{' '}
                <strong>Kelompok</strong> tidak masuk peringkat global — tetap terlihat di tab{' '}
                <em>Class Leaderboard</em> / <em>Team</em>.
              </CardContent>
            </Card>
            {globalRows.length === 0 && !loadError && !loading ? (
              <Card className='rounded-2xl border border-dashed border-gray-200'>
                <CardContent className='p-8 text-center text-sm text-gray-600'>
                  Belum ada data siswa dengan skor progres. Mainkan case sebagai siswa untuk mengisi leaderboard.
                </CardContent>
              </Card>
            ) : null}

            {showPodium ? (
              <div className='grid md:grid-cols-3 gap-6'>
                {podiumOrder.map((player) => {
                  const actualRank = player.rank;
                  const rankTheme =
                    actualRank === 1
                      ? 'from-yellow-100 to-yellow-50 border-yellow-200'
                      : actualRank === 2
                        ? 'from-gray-100 to-gray-50 border-gray-300'
                        : 'from-orange-100 to-orange-50 border-orange-200';
                  return (
                    <Card
                      key={player.user_id}
                      className={`rounded-3xl border bg-linear-to-br ${rankTheme} ${
                        actualRank === 1 ? 'md:scale-110 md:mt-0 md:order-2' : 'md:mt-6'
                      } ${actualRank === 2 ? 'md:order-1' : 'md:order-3'}`}
                    >
                      <CardContent className='p-6 text-center'>
                        <div className='w-16 h-16 mx-auto mb-3 rounded-full bg-white flex items-center justify-center shadow-md'>
                          {actualRank === 1 ? (
                            <Crown className='w-8 h-8 text-yellow-600' />
                          ) : actualRank === 2 ? (
                            <Medal className='w-8 h-8 text-gray-500' />
                          ) : (
                            <Award className='w-8 h-8 text-orange-600' />
                          )}
                        </div>
                        <p className='font-bold text-gray-900 text-lg'>{player.name}</p>
                        <p className='text-yellow-700 font-bold text-xl'>{Number(player.total_score).toLocaleString()}</p>
                        <p className='text-sm text-gray-600'>
                          {player.cases_completed} case selesai • {player.badges_earned} badge
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : null}

            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-0'>
                <Table>
                  <TableHeader className='bg-linear-to-r from-purple-50 to-blue-50'>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Cases</TableHead>
                      <TableHead>Badges</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((player) => (
                      <TableRow key={player.user_id}>
                        <TableCell>
                          <div className='w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-700'>
                            {player.rank}
                          </div>
                        </TableCell>
                        <TableCell className='font-semibold text-gray-900'>{player.name}</TableCell>
                        <TableCell className='font-bold text-yellow-700'>
                          {Number(player.total_score).toLocaleString()}
                        </TableCell>
                        <TableCell className='font-semibold'>{player.cases_completed}</TableCell>
                        <TableCell>
                          <div className='inline-flex items-center gap-1'>
                            <Star className='w-4 h-4 text-purple-600' />
                            <span className='font-bold'>{player.badges_earned}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {globalRows.length === 0 && !loadError ? (
                      <TableRow>
                        <TableCell colSpan={5} className='text-center text-sm text-gray-500 py-8'>
                          Tidak ada baris.
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {showPodium && tableRows.length === 0 && globalRows.length > 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className='text-center text-xs text-gray-500 py-4'>
                          Semua pemain tampil di podium di atas.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='class' className='space-y-4'>
            <Card className='border border-gray-200 bg-gray-50'>
              <CardContent className='p-4 text-sm text-gray-700'>
                Peringkat per <strong>kelas</strong> memuat semua progres pada case yang terpasang di kelas itu — baik
                mode <strong>Individu</strong> maupun <strong>Kelompok</strong>. Pilih kelas atau &quot;Semua&quot; untuk
                gabungan terurut skor.
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className='w-full sm:w-72 bg-gray-50'>
                    <SelectValue placeholder='Pilih kelas' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Semua kelas (gabungan)</SelectItem>
                    {classOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className='rounded-3xl border border-gray-200 shadow-sm'>
              <CardContent className='p-0'>
                <Table>
                  <TableHeader className='bg-linear-to-r from-purple-50 to-blue-50'>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Cases done</TableHead>
                      <TableHead>Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClassLeaderboard.map((student) => (
                      <TableRow
                        key={`${student.user_id}-${student.rank}-${student.className ?? selectedClassId}`}
                      >
                        <TableCell>
                          <Badge variant='outline'>#{student.rank}</Badge>
                        </TableCell>
                        <TableCell className='font-semibold'>{student.name}</TableCell>
                        <TableCell className='font-bold text-yellow-700'>
                          {Number(student.total_score).toLocaleString()}
                        </TableCell>
                        <TableCell className='text-gray-700'>{student.cases_completed}</TableCell>
                        <TableCell className='text-gray-600'>
                          {student.className ?? classBlocks.find((b) => b.class_id === selectedClassId)?.name ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredClassLeaderboard.length === 0 && !loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className='text-center text-sm text-gray-500 py-8'>
                          {classBlocks.length === 0
                            ? 'Belum ada kelas. Buat kelas di admin dan hubungkan ke case.'
                            : 'Belum ada progres siswa pada case di kelas ini.'}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='team' className='space-y-6'>
            <Card className='border border-gray-200 bg-gray-50'>
              <CardContent className='p-4 text-sm text-gray-700'>
                Tampilan <strong>per kelas</strong>: di dalam setiap kelas ada satu atau lebih <strong>tim</strong>{' '}
                (mis. kelompok belajar). Skor tim menggabungkan progres anggota pada case kelas mode kelompok. Pilih
                kelas di bawah untuk menyaring daftar, atau <strong>Semua kelas</strong> untuk menampilkan semua.
              </CardContent>
            </Card>

            <Card>
              <CardContent className='p-4'>
                <Select value={selectedTeamClassId} onValueChange={setSelectedTeamClassId}>
                  <SelectTrigger className='w-full sm:w-72 bg-gray-50'>
                    <SelectValue placeholder='Filter kelas' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Semua kelas</SelectItem>
                    {teamClassFilterOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {filteredTeamByClass.map((cls) => (
              <Card key={String(cls.class_id)} className='rounded-3xl border border-gray-200 shadow-sm'>
                <CardContent className='p-0'>
                  <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-linear-to-r from-purple-50 to-blue-50 px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <Users className='h-5 w-5 text-purple-600' />
                      <h3 className='text-lg font-bold text-gray-900'>{cls.name}</h3>
                    </div>
                    <Badge variant='secondary' className='font-normal'>
                      {cls.teams.length} tim
                    </Badge>
                  </div>
                  {cls.teams.length === 0 ? (
                    <p className='p-6 text-sm text-gray-500'>Belum ada tim di kelas ini.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className='hover:bg-transparent'>
                          <TableHead className='w-12'>#</TableHead>
                          <TableHead>Tim</TableHead>
                          <TableHead className='text-right'>Skor</TableHead>
                          <TableHead className='text-right'>Anggota</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cls.teams.map((team, idx) => (
                          <TableRow key={team.team_id}>
                            <TableCell>
                              <span className='text-gray-500'>#{team.rank ?? idx + 1}</span>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-2'>
                                <span className='text-xl' aria-hidden>
                                  {TEAM_EMOJI[idx % TEAM_EMOJI.length]}
                                </span>
                                <span className='font-semibold text-gray-900'>{team.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className='text-right font-bold text-yellow-700'>
                              {Number(team.total_score).toLocaleString()}
                            </TableCell>
                            <TableCell className='text-right text-gray-700'>{team.members}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredTeamByClass.length === 0 && !loading ? (
              <Card className='rounded-2xl border border-dashed border-gray-200'>
                <CardContent className='p-8 text-center text-sm text-gray-600'>
                  {teamByClass.length === 0 ? (
                    <>
                      Belum ada data tim per kelas. Pastikan backend mengembalikan{' '}
                      <code className='rounded bg-gray-100 px-1'>classes[].teams[]</code> atau{' '}
                      <code className='rounded bg-gray-100 px-1'>teams[]</code> dengan field{' '}
                      <code className='rounded bg-gray-100 px-1'>class_id</code>.
                    </>
                  ) : (
                    <>
                      Tidak ada data tim untuk kelas yang dipilih. Ubah filter ke{' '}
                      <strong>Semua kelas</strong> atau pilih kelas lain.
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
