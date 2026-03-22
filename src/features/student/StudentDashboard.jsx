import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  GraduationCap,
  Lock,
  Play,
  Search,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { StudentDashboardSkeleton } from '@/components/common/page-skeletons';
import { EmptyState } from '@/components/common/empty-state';
import { AnomathLogo } from '@/components/branding/anomath-logo';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { fetchMe } from '@/lib/api/auth';
import { listCases } from '@/lib/api/cases';
import { listProgress } from '@/lib/api/progress';
import { listMyBadges } from '@/lib/api/rewards';
import {
  fetchMyClasses,
  fetchStudentPublicClasses,
  joinStudentClass,
} from '@/lib/api/student';

const statTheme = {
  yellow: 'from-yellow-200 to-yellow-100 text-yellow-600',
  purple: 'from-purple-200 to-purple-100 text-purple-600',
  blue: 'from-blue-200 to-blue-100 text-blue-600',
  pink: 'from-pink-200 to-pink-100 text-pink-600',
};

const caseTheme = {
  blue: 'from-blue-100 to-blue-50 border-blue-200 text-blue-700',
  pink: 'from-pink-100 to-pink-50 border-pink-200 text-pink-700',
  yellow: 'from-yellow-100 to-yellow-50 border-yellow-200 text-yellow-700',
  purple: 'from-purple-100 to-purple-50 border-purple-200 text-purple-700',
};

const EMOJI = ['🔢', '📐', '📏', '🧮', '🔍', '∞', '🎯'];

function capDiff(d) {
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function studentClassHref(c) {
  if (!c?.id) return '/student';
  if (c.join_code) return `/student?code=${encodeURIComponent(c.join_code)}`;
  return `/student?class_id=${encodeURIComponent(c.id)}`;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFilter = searchParams.get('code')?.trim() || null;
  const legacyClassIdFilter = searchParams.get('class_id')?.trim() || null;
  const hasClassContext = Boolean(codeFilter || legacyClassIdFilter);

  const [me, setMe] = useState(null);
  const [myClasses, setMyClasses] = useState([]);
  const [publicClasses, setPublicClasses] = useState([]);
  const [casesList, setCasesList] = useState([]);
  const [progressList, setProgressList] = useState([]);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joining, setJoining] = useState(false);

  const mustJoinBeforeClassCases = useMemo(() => {
    if (!codeFilter && !legacyClassIdFilter) return false;
    if (codeFilter) {
      const up = codeFilter.toUpperCase();
      return !myClasses.some(
        (c) => String(c.join_code || '').toUpperCase() === up,
      );
    }
    const ids = new Set((myClasses || []).map((c) => String(c.id)));
    return !ids.has(String(legacyClassIdFilter));
  }, [codeFilter, legacyClassIdFilter, myClasses]);

  useEffect(() => {
    if (codeFilter)
      setJoinCodeInput((prev) => (prev ? prev : codeFilter.toUpperCase()));
  }, [codeFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const user = await fetchMe().catch(() => null);
        const myRes = await fetchMyClasses().catch(() => ({ classes: [] }));
        const pubRes = await fetchStudentPublicClasses().catch(() => ({
          classes: [],
        }));
        if (cancelled) return;
        if (user) setMe(user);
        const mine = myRes?.classes ?? [];
        setMyClasses(mine);
        setPublicClasses(pubRes?.classes ?? []);

        const ids = new Set(mine.map((c) => String(c.id)));
        let needJoin = false;
        if (codeFilter) {
          const up = codeFilter.toUpperCase();
          needJoin = !mine.some(
            (c) => String(c.join_code || '').toUpperCase() === up,
          );
        } else if (legacyClassIdFilter) {
          needJoin = !ids.has(String(legacyClassIdFilter));
        }

        let casesRes = { cases: [] };
        if (!needJoin) {
          const listParams = { page_size: 50 };
          if (codeFilter) listParams.code = codeFilter;
          else if (legacyClassIdFilter)
            listParams.class_id = legacyClassIdFilter;
          casesRes = await listCases(listParams).catch(() => ({ cases: [] }));
        }
        if (cancelled) return;
        setCasesList(casesRes?.cases || []);

        const [progRes, badRes] = await Promise.all([
          listProgress().catch(() => ({ progress: [] })),
          listMyBadges().catch(() => ({ badges: [] })),
        ]);
        if (cancelled) return;
        setProgressList(progRes?.progress || []);
        setBadgeCount(badRes?.badges?.length ?? 0);
      } catch (e) {
        if (!cancelled)
          toast.error(
            e instanceof Error ? e.message : 'Gagal memuat dashboard',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [codeFilter, legacyClassIdFilter]);

  /**
   * Muat case untuk konteks kelas. `listScope` dipakai setelah join saat URL belum
   * punya ?code= / ?class_id= — tanpa ini listCases hanya { page_size } dan case terikat kelas hilang.
   * @param {object} [listScope]
   * @param {string} [listScope.joinCode]
   * @param {string|number} [listScope.classId]
   */
  async function applyMembershipAndCases(mine, listScope = null) {
    setMyClasses(mine);
    const joinCode =
      (listScope?.joinCode && String(listScope.joinCode).trim()) ||
      codeFilter ||
      null;
    const classIdRaw =
      listScope?.classId != null && String(listScope.classId) !== ''
        ? String(listScope.classId)
        : legacyClassIdFilter;

    const ids = new Set(mine.map((c) => String(c.id)));
    let needJoin = false;
    if (joinCode) {
      const up = joinCode.toUpperCase();
      needJoin = !mine.some(
        (c) => String(c.join_code || '').toUpperCase() === up,
      );
    } else if (classIdRaw) {
      needJoin = !ids.has(String(classIdRaw));
    }
    if (needJoin) {
      setCasesList([]);
      return;
    }
    const listParams = { page_size: 50 };
    if (joinCode) listParams.code = joinCode;
    else if (classIdRaw) listParams.class_id = classIdRaw;
    const casesRes = await listCases(listParams).catch(() => ({ cases: [] }));
    setCasesList(casesRes?.cases || []);
  }

  async function handleJoinByCode() {
    const code = joinCodeInput.trim();
    if (!code) {
      toast.error('Masukkan kode kelas');
      return;
    }
    setJoining(true);
    try {
      await joinStudentClass({ join_code: code });
      toast.success('Berhasil bergabung ke kelas');
      const myRes = await fetchMyClasses().catch(() => ({ classes: [] }));
      await applyMembershipAndCases(myRes?.classes ?? [], { joinCode: code });
      setJoinCodeInput('');
      navigate(`/student?code=${encodeURIComponent(code)}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal bergabung');
    } finally {
      setJoining(false);
    }
  }

  async function handleJoinPublicClass(classId) {
    setJoining(true);
    try {
      await joinStudentClass({ class_id: classId });
      toast.success('Berhasil bergabung ke kelas');
      const myRes = await fetchMyClasses().catch(() => ({ classes: [] }));
      const mine = myRes?.classes ?? [];
      const pubRes = await fetchStudentPublicClasses().catch(() => ({
        classes: [],
      }));
      setPublicClasses(pubRes?.classes ?? []);
      await applyMembershipAndCases(mine, { classId: classId });
      navigate(
        `/student?class_id=${encodeURIComponent(String(classId))}`,
        { replace: true },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal bergabung');
    } finally {
      setJoining(false);
    }
  }

  const studentProgress = useMemo(() => {
    const totalScore = progressList.reduce((s, p) => s + (p.score || 0), 0);
    const casesCompleted = progressList.filter((p) => p.is_completed).length;
    return {
      name: me?.name || 'Detective',
      score: totalScore,
      level: Math.max(1, Math.floor(totalScore / 500) + 1),
      casesCompleted,
      totalCases: Math.max(1, new Set((casesList || []).map((c) => c.id)).size),
      rank: '—',
      streak: '—',
    };
  }, [me, progressList, casesList]);

  const currentCase = useMemo(() => {
    const inProg = progressList.find((p) => !p.is_completed);
    if (inProg) {
      const c = casesList.find((x) => x.id === inProg.case_id);
      if (c) {
        return {
          id: c.id,
          title: c.title,
          difficulty: capDiff(c.difficulty),
          progress: 50,
          stage: `Order ${inProg.current_puzzle}`,
          points: inProg.score ?? 0,
          thumbnail: EMOJI[0],
        };
      }
    }
    const first = casesList[0];
    if (!first) return null;
    return {
      id: first.id,
      title: first.title,
      difficulty: capDiff(first.difficulty),
      progress: 0,
      stage: '1',
      points: 0,
      thumbnail: EMOJI[0],
    };
  }, [casesList, progressList]);

  const casesByListingOrigin = useMemo(() => {
    const privateLike = [];
    const publicLike = [];
    for (const c of casesList) {
      const o = c.student_listing_origin ?? 'private_class';
      if (o === 'private_class' || o === 'both') privateLike.push(c);
      if (o === 'public_class' || o === 'both') publicLike.push(c);
    }
    return { privateLike, publicLike };
  }, [casesList]);

  const mapCaseToCard = (c, i) => ({
    id: c.id,
    title: c.title,
    difficulty: capDiff(c.difficulty),
    completed: 0,
    points: 150 + i * 50,
    icon: EMOJI[i % EMOJI.length],
    color: ['blue', 'pink', 'yellow', 'purple'][i % 4],
    locked: false,
    listingOrigin: c.student_listing_origin ?? 'private_class',
  });

  function listingOriginBadge(origin) {
    if (origin === 'public_class') {
      return {
        label: 'Kelas publik',
        className:
          'bg-emerald-600/15 text-emerald-900 border border-emerald-200',
      };
    }
    if (origin === 'both') {
      return {
        label: 'Kode & publik',
        className:
          'bg-violet-600/15 text-violet-900 border border-violet-200',
      };
    }
    return {
      label: 'Kode kelas',
      className: 'bg-slate-600/10 text-slate-800 border border-slate-200',
    };
  }

  function renderCaseCard(caseItem, listKey) {
    const badge = listingOriginBadge(caseItem.listingOrigin);
    return (
      <Card
        key={`case-${caseItem.id}-${listKey}`}
        className={`bg-linear-to-br rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all ${caseTheme[caseItem.color]} ${caseItem.locked ? 'opacity-60' : ''}`}
      >
        <CardContent className='p-0'>
          <div className='mb-2 flex flex-wrap items-center gap-2'>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <div className='flex items-start justify-between mb-4'>
            <div className='w-14 h-14 rounded-xl bg-white flex items-center justify-center text-3xl shadow-sm'>
              {caseItem.locked ? (
                <Lock className='w-7 h-7 text-gray-400' />
              ) : (
                caseItem.icon
              )}
            </div>
            <div className='flex items-center gap-1 text-yellow-600 font-bold text-sm'>
              <Trophy className='w-4 h-4' />
              <span>{caseItem.points}</span>
            </div>
          </div>
          <h3 className='font-bold text-gray-900 mb-2'>{caseItem.title}</h3>
          <div className='flex items-center gap-2 mb-4'>
            <span className='px-2 py-1 bg-white rounded-lg text-xs font-semibold'>
              {caseItem.difficulty}
            </span>
          </div>

          {!caseItem.locked ? (
            <Button
              asChild
              className='w-full py-2 bg-white text-purple-700 rounded-xl font-semibold hover:shadow-sm transition-all'
            >
              <Link to={`/case/${caseItem.id}`}>Mulai</Link>
            </Button>
          ) : (
            <div className='bg-white/50 rounded-xl p-3 text-center'>
              <p className='text-xs text-gray-600'>Terkunci</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const leaderboard = [];

  if (loading) {
    return <StudentDashboardSkeleton />;
  }

  return (
    <div className='min-h-screen bg-white'>
      <nav className='bg-white border-b border-gray-200 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 w-full items-center'>
            <AnomathLogo size='md' />

            <div className='ml-auto flex items-center gap-3'>
              <a
                href='#leaderboard'
                className='hidden sm:flex items-center gap-2 px-2 py-2 text-gray-600 hover:text-gray-900 transition-colors'
              >
                <Trophy className='w-5 h-5 shrink-0' />
                <span>Peringkat</span>
              </a>
              <LogoutButton
                className='shrink-0 rounded-full border-0 bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 hover:bg-linear-to-r hover:opacity-95 hover:shadow-md'
                variant='ghost'
              />
            </div>
          </div>
        </div>
      </nav>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl sm:text-4xl font-bold mb-2 text-gray-900'>
            Halo,{' '}
            <span className='bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>
              {studentProgress.name}
            </span>
          </h1>
          {hasClassContext ? (
            <div className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-purple-900'>
              <span className='rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 font-mono text-xs font-semibold'>
                {codeFilter ? codeFilter.toUpperCase() : 'Kelas'}
              </span>
              <Link
                to='/student'
                className='font-medium underline-offset-2 hover:underline'
              >
                Semua case
              </Link>
            </div>
          ) : null}
        </div>

        {mustJoinBeforeClassCases ? (
          <Card className='mb-6 rounded-2xl border border-amber-200 bg-amber-50/90'>
            <CardContent className='space-y-3 p-5'>
              <p className='font-semibold text-amber-950'>
                Masukkan kode kelas
              </p>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Input
                  placeholder='Kode kelas'
                  value={joinCodeInput}
                  onChange={(e) =>
                    setJoinCodeInput(e.target.value.toUpperCase())
                  }
                  className='max-w-md font-mono uppercase'
                />
                <Button
                  type='button'
                  disabled={joining}
                  onClick={handleJoinByCode}
                >
                  Gabung
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className='mb-6 grid gap-4 lg:grid-cols-2'>
          <Card className='rounded-2xl border border-gray-200'>
            <CardContent className='space-y-3 p-5'>
              <div className='flex items-center gap-2 font-semibold text-gray-900'>
                <GraduationCap className='h-5 w-5 text-purple-600' />
                Kelas saya
              </div>
              {myClasses.length === 0 ? (
                <p className='text-sm text-gray-600'>
                  Belum bergabung ke kelas manapun.
                </p>
              ) : (
                <ul className='space-y-2'>
                  {myClasses.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={studentClassHref(c)}
                        className='text-sm font-medium text-purple-700 underline-offset-2 hover:underline'
                      >
                        {c.name}
                        {c.grade != null ? ` · kelas ${c.grade}` : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {!mustJoinBeforeClassCases ? (
            <Card className='rounded-2xl border border-gray-200'>
              <CardContent className='space-y-3 p-5'>
                <div className='flex items-center gap-2 font-semibold text-gray-900'>
                  <Search className='h-5 w-5 text-purple-600' />
                  Kode kelas
                </div>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                  <Input
                    placeholder='Kode kelas'
                    value={joinCodeInput}
                    onChange={(e) =>
                      setJoinCodeInput(e.target.value.toUpperCase())
                    }
                    className='max-w-md font-mono uppercase'
                  />
                  <Button
                    type='button'
                    disabled={joining}
                    onClick={handleJoinByCode}
                  >
                    Gabung
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className='bg-linear-to-br from-purple-50 to-blue-50 rounded-3xl p-8 mb-8 border border-gray-200'>
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>Statistik</h2>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            {[
              {
                label: 'Skor',
                value: studentProgress.score.toLocaleString(),
                icon: Trophy,
                color: 'yellow',
              },
              {
                label: 'Level',
                value: studentProgress.level,
                icon: Star,
                color: 'purple',
              },
              {
                label: 'Case',
                value: `${studentProgress.casesCompleted}/${studentProgress.totalCases}`,
                icon: Target,
                color: 'blue',
              },
              {
                label: 'Badge',
                value: String(badgeCount),
                icon: Zap,
                color: 'pink',
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.label}
                  className='bg-white rounded-2xl p-6 border border-gray-200 shadow-sm'
                >
                  <CardContent className='p-0'>
                    <div
                      className={`w-12 h-12 rounded-xl bg-linear-to-br ${statTheme[stat.color]} flex items-center justify-center mb-3 shadow-sm`}
                    >
                      <Icon className='w-6 h-6' />
                    </div>
                    <div className='text-3xl font-bold text-gray-900 mb-1'>
                      {stat.value}
                    </div>
                    <div className='text-sm text-gray-600'>{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Card>

        <div className='grid lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2 space-y-8'>
            <div>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Continue Case
              </h2>
              {currentCase ? (
                <Card className='bg-linear-to-br from-purple-100 to-blue-100 rounded-3xl p-8 border border-purple-200 shadow-sm'>
                  <CardContent className='p-0'>
                    <div className='flex items-start justify-between mb-6'>
                      <div className='flex items-start gap-4'>
                        <div className='w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-4xl shadow-sm'>
                          {currentCase.thumbnail}
                        </div>
                        <div>
                          <h3 className='text-2xl font-bold text-gray-900 mb-1'>
                            {currentCase.title}
                          </h3>
                          <div className='flex items-center gap-3 text-sm'>
                            <span className='px-3 py-1 bg-purple-200 text-purple-700 rounded-full font-semibold'>
                              {currentCase.difficulty}
                            </span>
                            <span className='text-gray-600'>
                              {currentCase.stage}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='flex items-center gap-1 text-yellow-600 font-bold'>
                          <Trophy className='w-5 h-5' />
                          <span>{currentCase.points}</span>
                        </div>
                        <div className='text-xs text-gray-600'>poin</div>
                      </div>
                    </div>

                    <div className='mb-6'>
                      <div className='flex items-center justify-between text-sm mb-2'>
                        <span className='text-gray-700 font-medium'>
                          Progres
                        </span>
                        <span className='text-gray-900 font-bold'>
                          {currentCase.progress}%
                        </span>
                      </div>
                      <Progress value={currentCase.progress} />
                    </div>

                    <Button
                      asChild
                      className='w-full py-6 bg-white text-purple-700 rounded-2xl font-bold text-lg hover:shadow-md transition-all'
                    >
                      <Link to={`/case/${currentCase.id}/story`}>
                        <Play className='w-5 h-5 mr-2' />
                        Lanjut
                        <ArrowRight className='w-5 h-5 ml-2' />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <p className='text-sm text-gray-500'>—</p>
              )}
            </div>

            <div className='space-y-10'>
              <div>
                <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                  Kelas publik
                </h2>
                <div className='grid sm:grid-cols-2 gap-4'>
                  {publicClasses.map((c) => {
                    const enrolled = myClasses.some(
                      (m) => String(m.id) === String(c.id),
                    );
                    return (
                      <Card
                        key={`pub-class-${c.id}`}
                        className='rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/90 to-white p-6 shadow-sm transition-all hover:shadow-md'
                      >
                        <CardContent className='p-0'>
                          <div className='mb-3 flex items-start justify-between gap-2'>
                            <span className='rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs font-semibold text-emerald-800'>
                              Publik
                            </span>
                            <Users className='h-5 w-5 shrink-0 text-emerald-700' />
                          </div>
                          <h3 className='mb-1 font-bold text-gray-900'>
                            {c.name}
                          </h3>
                          <p className='mb-4 text-xs text-gray-600'>
                            {[
                              c.teacher_name,
                              c.grade != null ? `Kelas ${c.grade}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </p>
                          {enrolled ? (
                            <Button
                              asChild
                              className='w-full rounded-xl bg-white py-2 font-semibold text-emerald-800 hover:bg-emerald-50'
                              variant='outline'
                            >
                              <Link to={studentClassHref(c)}>Buka kelas</Link>
                            </Button>
                          ) : (
                            <Button
                              type='button'
                              className='w-full rounded-xl bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700'
                              disabled={joining}
                              onClick={() => handleJoinPublicClass(c.id)}
                            >
                              Gabung kelas
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {publicClasses.length === 0 ? (
                  <p className='text-sm text-gray-500'>
                    Belum ada kelas yang dipublikasikan.
                  </p>
                ) : null}
              </div>

              <div>
                <h2 className='text-2xl font-bold text-gray-900 mb-2'>Case</h2>
                <p className='mb-4 text-sm text-gray-600'>
                  Case dari kelas yang kamu ikuti dibedakan: lewat kode (privat)
                  atau lewat kelas publik.
                </p>

                {casesByListingOrigin.privateLike.length > 0 ? (
                  <div className='mb-8'>
                    <h3 className='text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2'>
                      <Lock className='h-5 w-5 text-slate-600' />
                      Dari kelas (kode / privat)
                    </h3>
                    <div className='grid sm:grid-cols-2 gap-4'>
                      {casesByListingOrigin.privateLike.map((c, i) =>
                        renderCaseCard(mapCaseToCard(c, i), 'priv'),
                      )}
                    </div>
                  </div>
                ) : null}

                {casesByListingOrigin.publicLike.length > 0 ? (
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2'>
                      <Users className='h-5 w-5 text-emerald-700' />
                      Dari kelas publik
                    </h3>
                    <div className='grid sm:grid-cols-2 gap-4'>
                      {casesByListingOrigin.publicLike.map((c, i) =>
                        renderCaseCard(mapCaseToCard(c, i), 'pub'),
                      )}
                    </div>
                  </div>
                ) : null}

                {casesByListingOrigin.privateLike.length === 0 &&
                casesByListingOrigin.publicLike.length === 0 &&
                publicClasses.length === 0 ? (
                  <EmptyState title='Belum ada case atau kelas publik' />
                ) : null}
                {casesByListingOrigin.privateLike.length === 0 &&
                casesByListingOrigin.publicLike.length === 0 &&
                publicClasses.length > 0 ? (
                  <p className='text-sm text-gray-500'>
                    Gabung ke kelas (kode atau publik) untuk melihat case.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className='space-y-8'>
            <Card
              id='leaderboard'
              className='bg-white rounded-3xl p-6 border border-gray-200 shadow-sm'
            >
              <CardContent className='p-0'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-bold text-gray-900'>
                    Peringkat
                  </h3>
                </div>
                <div className='min-h-[100px] space-y-3'>
                  {leaderboard.length === 0 ? (
                    <EmptyState title='Kosong' />
                  ) : (
                    leaderboard.map((student) => (
                      <div
                        key={student.rank}
                        className={`flex items-center gap-3 p-3 rounded-xl ${student.current ? 'bg-linear-to-r from-purple-50 to-blue-50 border-2 border-purple-200' : 'bg-gray-50'}`}
                      >
                        <div className='w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-sm shadow-sm'>
                          {student.rank}
                        </div>
                        <div className='w-10 h-10 rounded-full bg-linear-to-br from-purple-200 to-blue-200 flex items-center justify-center text-xl'>
                          {student.avatar}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div
                            className={`font-semibold truncate ${student.current ? 'text-purple-700' : 'text-gray-900'}`}
                          >
                            {student.name}
                          </div>
                          <div className='text-xs text-gray-600'>
                            {student.score.toLocaleString()} poin
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className='bg-white rounded-3xl p-6 border border-gray-200 shadow-sm'>
              <CardContent className='p-0'>
                <h3 className='text-xl font-bold text-gray-900 mb-4'>
                  Ringkasan
                </h3>
                <div className='space-y-4'>
                  {[
                    {
                      label: 'Skor',
                      value: String(studentProgress.score),
                      icon: Target,
                      theme: 'bg-blue-50 text-blue-600',
                    },
                    {
                      label: 'Badge',
                      value: String(badgeCount),
                      icon: Trophy,
                      theme: 'bg-purple-50 text-purple-600',
                    },
                    {
                      label: 'Case selesai',
                      value: String(studentProgress.casesCompleted),
                      icon: TrendingUp,
                      theme: 'bg-green-50 text-green-600',
                    },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className='flex items-center justify-between'
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.theme}`}
                          >
                            <Icon className='w-5 h-5' />
                          </div>
                          <span className='text-sm text-gray-600'>
                            {stat.label}
                          </span>
                        </div>
                        <span className='font-bold text-gray-900'>
                          {stat.value}
                        </span>
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
