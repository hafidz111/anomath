import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  GraduationCap,
  Lightbulb,
  Play,
  Puzzle,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

import { AnomathLogo, AnomathLogoMark } from '@/components/branding/anomath-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const [visibleSections, setVisibleSections] = useState({});
  const pricingScrollRef = useRef(null);
  /** Default highlight: Student Pro (index 1) */
  const [activePricingIndex, setActivePricingIndex] = useState(1);
  const [hoveredPricingIndex, setHoveredPricingIndex] = useState(null);
  const pricingPlans = [
    {
      id: 'student-free',
      name: 'Student Free',
      role: 'student',
      subscription: 'free',
      price: 'Free',
      description: 'Start learning with core case gameplay',
      features: [
        'Access detective cases',
        'Earn badges and rewards',
        'Join class leaderboards',
        'Track your progress',
        'Daily challenges',
      ],
      gradient: 'from-purple-100 to-purple-50',
      buttonText: 'Start Free',
      popular: false,
    },
    {
      id: 'student-pro',
      name: 'Student Pro',
      role: 'student',
      subscription: 'pro',
      price: '$3',
      period: '/month',
      description: 'For students with guided AI support',
      features: [
        'Access all detective cases',
        'Hint AI unlock for difficult questions',
        'Up to 50 AI hints per month',
        'Earn badges and rewards',
        'Join class leaderboards',
        'Track your progress',
        'Daily challenges',
      ],
      gradient: 'from-purple-100 to-purple-50',
      buttonText: 'Unlock Student Pro',
      popular: true,
    },
    {
      id: 'teacher-free',
      name: 'Teacher Free',
      role: 'teacher',
      subscription: 'free',
      price: 'Free',
      description: 'For teachers who want to start quickly',
      features: [
        'Up to 2 active classes',
        'Create basic cases',
        'Basic student progress view',
        'Class leaderboard access',
        'Community support',
      ],
      gradient: 'from-blue-100 to-blue-50',
      buttonText: 'Start Free',
      popular: false,
    },
    {
      id: 'teacher-pro',
      name: 'Teacher Pro',
      role: 'teacher',
      subscription: 'pro',
      price: '$29',
      period: '/month',
      description: 'For educators and schools',
      features: [
        'Unlimited classes',
        'Create custom cases',
        'Student analytics',
        'Progress tracking',
        'Priority support',
      ],
      gradient: 'from-blue-100 to-blue-50',
      buttonText: 'Start Pro Trial',
      popular: false,
    },
    {
      id: 'school',
      name: 'School',
      role: 'teacher',
      subscription: 'enterprise',
      price: 'Custom',
      description: 'For entire schools',
      features: [
        'Unlimited teachers',
        'Unlimited students',
        'Advanced analytics',
        'Custom branding',
        'Dedicated support',
      ],
      gradient: 'from-pink-100 to-pink-50',
      buttonText: 'Contact Sales',
      popular: false,
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-reveal');
          if (!id) return;
          if (entry.isIntersecting) {
            setVisibleSections((prev) => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.2 },
    );

    const targets = document.querySelectorAll('[data-reveal]');
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const track = pricingScrollRef.current;
    if (!track) return undefined;

    const STUDENT_PRO_INDEX = 1;

    /** Geser scroll supaya pusat kartu = pusat viewport track (offsetLeft sering salah di flex). */
    const centerStudentPro = () => {
      const target = track.querySelector('[data-pricing-card="student-pro"]');
      if (!target) return;
      const trackRect = track.getBoundingClientRect();
      const cardRect = target.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;
      const cardCenter = cardRect.left + cardRect.width / 2;
      const delta = cardCenter - trackCenter;
      track.scrollLeft += delta;
    };

    const updateCenterCard = () => {
      const cards = track.querySelectorAll('[data-pricing-card]');
      if (!cards.length) return;
      const trackRect = track.getBoundingClientRect();
      const centerX = trackRect.left + trackRect.width / 2;
      let nearest = 0;
      let minDist = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const r = card.getBoundingClientRect();
        const cardCenterX = r.left + r.width / 2;
        const dist = Math.abs(centerX - cardCenterX);
        if (dist < minDist) {
          minDist = dist;
          nearest = index;
        }
      });
      setActivePricingIndex(nearest);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        centerStudentPro();
        setActivePricingIndex(STUDENT_PRO_INDEX);
      });
    });

    track.addEventListener('scroll', updateCenterCard, { passive: true });
    window.addEventListener('resize', updateCenterCard);

    return () => {
      track.removeEventListener('scroll', updateCenterCard);
      window.removeEventListener('resize', updateCenterCard);
    };
  }, []);

  return (
    <div className='min-h-screen bg-white'>
      <nav className='fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <AnomathLogo size='md' wordmarkVariant='gradientSoft' />

            <div className='flex items-center gap-3'>
              <Button
                asChild
                variant='ghost'
                className='hidden sm:inline-flex px-5 py-2 text-gray-600 hover:text-gray-900 transition-colors font-medium'
              >
                <Link to='/login'>Sign In</Link>
              </Button>
              <Button
                asChild
                variant='default'
                className='h-auto px-6 py-2.5 bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 rounded-full hover:shadow-md transition-all font-semibold'
              >
                <Link
                  to='/register'
                >
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section
        data-reveal='hero'
        className={`pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen flex items-center transition-all duration-700 ${
          visibleSections.hero
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className='max-w-7xl mx-auto'>
          <div className='text-center max-w-4xl mx-auto'>
            <div className='inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-4 shadow-sm'>
              <Sparkles className='w-4 h-4 text-purple-500' />
              <span className='text-sm font-semibold text-purple-700'>
                ANOMATH - Gamified Math Learning Platform
              </span>
            </div>
            <p className='text-sm sm:text-base font-semibold text-blue-700 mb-6'>
              Belajar matematika terasa seperti menyelesaikan misi investigasi.
            </p>

            <h1 className='text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-gray-900'>
              Anomath Makes Math
              <br />
              <span className='bg-linear-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent'>
                Clear, Fun, and Competitive
              </span>
            </h1>

            <p className='text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto'>
              Siswa menyelesaikan case bertahap, kumpulkan clue, dan naik
              leaderboard. Guru memantau progres kelas, membuat case sendiri,
              dan mendorong belajar yang lebih aktif.
            </p>

            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button
                asChild
                className='h-auto px-8 py-4 rounded-full font-bold text-lg hover:shadow-lg transition-all flex items-center gap-2 bg-linear-to-r from-purple-300 to-blue-300 text-purple-700'
              >
                <Link
                  to='/register'
                >
                  <Play className='w-5 h-5' />
                  Start Playing
                </Link>
              </Button>

              <Button
                asChild
                variant='outline'
                className='h-auto px-8 py-4 rounded-full font-bold text-lg border-2 border-gray-200 hover:shadow-md transition-all flex items-center gap-2 bg-white text-gray-700'
              >
                <Link
                  to='/register'
                >
                  <GraduationCap className='w-5 h-5' />
                  Create a Class
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        data-reveal='how-it-works'
        className={`py-20 px-4 sm:px-6 lg:px-8 bg-white min-h-screen flex items-center transition-all duration-700 ${
          visibleSections['how-it-works']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl sm:text-5xl font-bold mb-4 text-gray-900'>
              How Anomath{' '}
              <span className='bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>
                Investigation Flow Works
              </span>
            </h2>
            <p className='text-xl text-gray-600'>
              Bukan sekadar quiz: setiap langkah membawa siswa ke deduksi akhir.
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-8 md:gap-10 items-stretch'>
            {[
              {
                step: '1',
                icon: Users,
                title: 'Read Case Brief',
                description:
                  'Masuk ke kasus, pahami kronologi kejadian, aturan investigasi, dan objective akhir yang harus dipecahkan.',
                gradient: 'from-purple-100 to-purple-50',
              },
              {
                step: '2',
                icon: Puzzle,
                title: 'Solve Stage-by-Stage Puzzles',
                description:
                  'Selesaikan puzzle matematika bertahap untuk membuka clue penting. Setiap stage mempersempit kemungkinan jawaban.',
                gradient: 'from-blue-100 to-blue-50',
              },
              {
                step: '3',
                icon: Trophy,
                title: 'Analyze Clues and Conclude',
                description:
                  'Kumpulkan clue di investigation board, susun hipotesis, lalu kirim final deduction layaknya detektif.',
                gradient: 'from-pink-100 to-pink-50',
              },
            ].map((s, index) => (
              <div
                key={s.step}
                className={`relative flex h-full min-h-0 flex-col overflow-visible transition-all duration-700 ${
                  visibleSections['how-it-works']
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                {/* Di luar Card: shadcn Card pakai overflow-hidden — angka sebagai pin di pojok kanan atas */}
                <div
                  className='pointer-events-none absolute -right-2 -top-2 z-20 flex h-14 w-14 items-center justify-center rounded-full border-2 border-purple-200 bg-white shadow-lg ring-4 ring-purple-100'
                  aria-hidden
                >
                  <span className='text-xl font-bold text-purple-600'>
                    {s.step}
                  </span>
                </div>
                <Card
                  className={`flex h-full min-h-[260px] flex-1 flex-col overflow-visible rounded-3xl bg-linear-to-br ${s.gradient} border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all`}
                >
                  <CardContent className='flex flex-1 flex-col p-8'>
                    <div className='mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm'>
                      <s.icon className='h-7 w-7 text-gray-700' />
                    </div>
                    <h3 className='mb-3 pr-12 text-2xl font-bold text-gray-900'>
                      {s.title}
                    </h3>
                    <p className='flex-1 text-gray-600 leading-relaxed'>
                      {s.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        data-reveal='student-features'
        className={`py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-purple-50 to-blue-50 min-h-screen flex items-center transition-all duration-700 ${
          visibleSections['student-features']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl sm:text-5xl font-bold mb-4 text-gray-900'>
              Student{' '}
              <span className='bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>
                Features
              </span>
            </h2>
            <p className='text-xl text-gray-600'>
              Everything students need for an engaging learning experience
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-6 items-stretch'>
            {[
              {
                icon: Puzzle,
                title: 'Solve Math Puzzles',
                description:
                  'Crack detective cases by solving math problems. Each puzzle unlocks new clues and advances the story.',
                iconBg: 'bg-linear-to-br from-purple-200 to-purple-100',
                iconColor: 'text-purple-600',
              },
              {
                icon: Trophy,
                title: 'Earn Badges',
                description:
                  'Collect achievement badges for completing cases, maintaining streaks, and reaching milestones.',
                iconBg: 'bg-linear-to-br from-yellow-200 to-yellow-100',
                iconColor: 'text-yellow-600',
              },
              {
                icon: BarChart3,
                title: 'Climb the Leaderboard',
                description:
                  'Compete with classmates and see your ranking. Track your progress and celebrate your achievements.',
                iconBg: 'bg-linear-to-br from-blue-200 to-blue-100',
                iconColor: 'text-blue-600',
              },
            ].map((f, index) => (
              <Card
                key={f.title}
                className={`flex h-full min-h-[220px] flex-col rounded-3xl border border-gray-200 bg-white p-0 shadow-sm hover:shadow-md transition-all duration-700 ${
                  visibleSections['student-features']
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                <CardContent className='flex flex-1 flex-col p-8'>
                  <div
                    className={`mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${f.iconBg} shadow-sm`}
                  >
                    <f.icon className={`h-8 w-8 ${f.iconColor}`} />
                  </div>
                  <h3 className='mb-3 text-2xl font-bold text-gray-900'>
                    {f.title}
                  </h3>
                  <p className='flex-1 text-gray-600 leading-relaxed'>
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        data-reveal='teacher-features'
        className={`py-20 px-4 sm:px-6 lg:px-8 bg-white min-h-screen flex items-center transition-all duration-700 ${
          visibleSections['teacher-features']
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl sm:text-5xl font-bold mb-4 text-gray-900'>
              Teacher{' '}
              <span className='bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
                Features
              </span>
            </h2>
            <p className='text-xl text-gray-600'>
              Powerful tools to manage classes and track progress
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-6 items-stretch'>
            {[
              {
                icon: Users,
                title: 'Create Classes',
                description:
                  'Organize students into classes easily. Invite students and manage multiple classes from one dashboard.',
                iconBg: 'bg-linear-to-br from-blue-200 to-blue-100',
                iconColor: 'text-blue-600',
              },
              {
                icon: Puzzle,
                title: 'Create Puzzles',
                description:
                  'Build custom detective cases and math puzzles tailored to your curriculum and student needs.',
                iconBg: 'bg-linear-to-br from-purple-200 to-purple-100',
                iconColor: 'text-purple-600',
              },
              {
                icon: BarChart3,
                title: 'Track Student Performance',
                description:
                  'Monitor individual and class progress with detailed analytics. Identify areas where students need help.',
                iconBg: 'bg-linear-to-br from-pink-200 to-pink-100',
                iconColor: 'text-pink-600',
              },
            ].map((f, index) => (
              <Card
                key={f.title}
                className={`flex h-full min-h-[220px] flex-col rounded-3xl border border-gray-200 bg-white p-0 shadow-sm hover:shadow-md transition-all duration-700 ${
                  visibleSections['teacher-features']
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                <CardContent className='flex flex-1 flex-col p-8'>
                  <div
                    className={`mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${f.iconBg} shadow-sm`}
                  >
                    <f.icon className={`h-8 w-8 ${f.iconColor}`} />
                  </div>
                  <h3 className='mb-3 text-2xl font-bold text-gray-900'>
                    {f.title}
                  </h3>
                  <p className='flex-1 text-gray-600 leading-relaxed'>
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        data-reveal='preview'
        className={`min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col justify-center transition-all duration-700 ${
          visibleSections.preview
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className='mx-auto flex w-full max-w-5xl flex-col'>
          <div className='mb-6 text-center sm:mb-8'>
            <h2 className='mb-2 text-3xl font-bold text-gray-900 sm:text-4xl'>
              Gameplay{' '}
              <span className='bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>
                Preview
              </span>
            </h2>
            <p className='text-base text-gray-600 sm:text-lg'>
              Cuplikan singkat pengalaman case di Anomath
            </p>
          </div>

          <Card className='rounded-2xl border border-gray-200 bg-white shadow-lg'>
            <CardContent className='p-4 sm:p-5'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3'>
                <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
                  <AnomathLogoMark size='md' className='sm:h-11 sm:w-11' />
                  <div className='min-w-0'>
                    <div className='text-xs text-gray-500'>Case #42</div>
                    <div className='truncate text-sm font-bold text-gray-900 sm:text-base'>
                      The Missing Numbers
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-1.5 rounded-full border border-yellow-200 bg-linear-to-r from-yellow-100 to-yellow-50 px-3 py-1.5'>
                  <Trophy className='h-4 w-4 shrink-0 text-yellow-600' />
                  <span className='text-sm font-bold text-yellow-700'>
                    +150
                  </span>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2 md:items-stretch'>
                <div className='rounded-xl border border-blue-200 bg-linear-to-br from-blue-50 to-purple-50 p-3 sm:p-4'>
                  <div className='flex gap-2.5'>
                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm'>
                      <Lightbulb className='h-5 w-5 text-blue-600' />
                    </div>
                    <div className='min-w-0'>
                      <div className='mb-0.5 text-sm font-bold text-gray-900'>
                        Detective&apos;s Note
                      </div>
                      <p className='text-xs leading-snug text-gray-600 sm:text-sm'>
                        Pecahkan persamaan untuk membuka petunjuk berikutnya.
                      </p>
                    </div>
                  </div>
                </div>

                <div className='rounded-xl border border-purple-200 bg-linear-to-br from-purple-50 to-blue-50 p-3 sm:p-4'>
                  <div className='mb-3 text-center'>
                    <div className='mb-1 text-xs text-gray-600'>
                      Solve the Equation
                    </div>
                    <div className='text-xl font-bold text-gray-900 sm:text-2xl'>
                      x + 15 = 42
                    </div>
                    <div className='mt-1 text-xs text-gray-600'>Nilai x?</div>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    {[
                      { answer: '27', correct: true },
                      { answer: '32', correct: false },
                      { answer: '57', correct: false },
                      { answer: '21', correct: false },
                    ].map((option) => (
                      <button
                        key={option.answer}
                        type='button'
                        className={`rounded-lg border-2 py-2 text-center text-sm font-bold transition-all sm:py-2.5 sm:text-base ${
                          option.correct
                            ? 'border-green-300 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option.answer}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className='mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-600 sm:text-sm'>
                <div className='flex items-center gap-1.5'>
                  <Sparkles className='h-4 w-4 shrink-0 text-purple-500' />
                  <span>3 clues unlocked</span>
                </div>
                <span>Stage 3/6</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        data-reveal='pricing'
        className={`overflow-visible py-20 px-4 sm:px-6 lg:px-8 bg-white min-h-screen flex items-center transition-all duration-700 ${
          visibleSections.pricing
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className='max-w-7xl mx-auto'>
          <div className='mb-1 text-center sm:mb-6'>
            <h2 className='mb-3 text-4xl font-bold text-gray-900 sm:text-5xl'>
              Simple{' '}
              <span className='bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>
                Pricing
              </span>
            </h2>
            <p className='text-lg text-gray-600 sm:text-xl'>
              Paket Anomath yang jelas untuk student dan teacher
            </p>
          </div>

          <div className='mx-auto max-w-7xl overflow-visible py-2'>
            <div
              ref={pricingScrollRef}
              onMouseLeave={() => setHoveredPricingIndex(null)}
              className='overflow-x-auto scroll-smooth [-webkit-overflow-scrolling:touch] overscroll-x-contain snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              role='region'
              aria-label='Daftar paket pricing'
            >
              <div className='flex items-stretch gap-5 py-14 pl-10 pr-10 sm:pl-14 sm:pr-14'>
              {pricingPlans.map((plan, index) => {
                const isHighlighted =
                  hoveredPricingIndex !== null
                    ? hoveredPricingIndex === index
                    : activePricingIndex === index;
                return (
                  <Card
                    key={plan.id}
                    data-pricing-card={plan.id}
                    onMouseEnter={() => setHoveredPricingIndex(index)}
                    className={`relative flex w-[min(85vw,320px)] shrink-0 snap-center flex-col overflow-visible! rounded-3xl border-2 bg-linear-to-br p-0 sm:w-[300px] ${plan.gradient} origin-center transition-all duration-300 ease-out will-change-transform ${
                      isHighlighted
                        ? 'z-20 scale-[1.06] border-purple-400 shadow-2xl ring-4 ring-purple-200/80'
                        : `z-0 scale-[0.94] opacity-[0.88] ${
                            plan.popular
                              ? 'border-blue-200 shadow-md ring-1 ring-blue-100/50'
                              : 'border-gray-200 shadow-sm'
                          }`
                    }`}
                  >
                    {plan.popular && (
                      <div className='absolute right-3 top-3 z-20'>
                        <span className='rounded-full bg-linear-to-r from-blue-500 to-purple-500 px-4 py-1 text-sm font-bold text-white shadow-md'>
                          Most Popular
                        </span>
                      </div>
                    )}

                    <CardContent className='flex flex-1 flex-col p-8'>
                      <div className='mb-6 text-center'>
                        <h3 className='mb-2 text-2xl font-bold text-gray-900'>
                          {plan.name}
                        </h3>
                        <p className='mb-4 text-sm text-gray-600'>
                          {plan.description}
                        </p>

                        <div className='flex items-baseline justify-center gap-1'>
                          <span className='text-4xl font-bold text-gray-900'>
                            {plan.price}
                          </span>
                          {plan.period && (
                            <span className='text-gray-600'>{plan.period}</span>
                          )}
                        </div>
                      </div>

                      <ul className='mb-8 flex-1 space-y-3'>
                        {plan.features.map((feature) => (
                          <li key={feature} className='flex items-center gap-2'>
                            <CheckCircle className='h-5 w-5 shrink-0 text-green-500' />
                            <span className='text-gray-600'>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        asChild
                        variant='default'
                        className={`h-auto w-full rounded-full py-3 font-bold transition-all ${
                          plan.popular
                            ? 'bg-linear-to-r from-blue-300 to-purple-300 text-blue-700 hover:shadow-lg'
                            : 'border-2 border-gray-200 bg-white text-gray-700 hover:shadow-md'
                        }`}
                      >
                        <Link to={`/register?role=${plan.role}&plan=${plan.subscription}`}>
                          {plan.buttonText}
                        </Link>
                      </Button>
                    </CardContent>
              </Card>
              );
              })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        data-reveal='cta'
        className={`py-24 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-purple-100 via-blue-100 to-pink-100 min-h-screen flex items-center transition-all duration-700 ${
          visibleSections.cta
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className='max-w-5xl mx-auto'>
          <Card className='rounded-3xl p-0 bg-white/80 backdrop-blur-sm shadow-xl border border-white/50'>
            <CardContent className='p-12 text-center'>
              <div className='w-20 h-20 mx-auto mb-6 rounded-3xl bg-linear-to-br from-purple-200 to-blue-200 shadow-lg flex items-center justify-center'>
                <Sparkles className='w-10 h-10 text-purple-600' />
              </div>

              <h2 className='text-4xl sm:text-5xl font-bold mb-6 text-gray-900'>
                Ready to Start Your
                <br />
                <span className='bg-linear-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent'>
                  Anomath Journey?
                </span>
              </h2>
              <p className='text-xl text-gray-600 mb-8 max-w-2xl mx-auto'>
                Join thousands of students making math fun. Start solving
                mysteries today!
              </p>

              <div className='flex flex-col sm:flex-row gap-4 justify-center mb-8'>
                <Button
                  asChild
                  className='h-auto px-8 py-4 bg-linear-to-r from-purple-300 to-blue-300 text-purple-700 rounded-full font-bold text-lg hover:shadow-xl transition-all flex items-center gap-2'
                >
                  <Link to='/register?role=student'>
                    <Play className='w-5 h-5' />
                    Start Playing Now
                    <ArrowRight className='w-5 h-5' />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant='outline'
                  className='h-auto px-8 py-4 rounded-full font-bold text-lg border-2 border-gray-200 hover:shadow-lg transition-all bg-white text-gray-700'
                >
                  <Link to='/register?role=teacher'>
                    Schedule Demo
                  </Link>
                </Button>
              </div>

              <div className='flex items-center justify-center gap-6 text-sm text-gray-600'>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='w-5 h-5 text-green-500' />
                  <span>No credit card required</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='w-5 h-5 text-green-500' />
                  <span>Free plans available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer
        data-reveal='footer'
        className={`bg-white border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          visibleSections.footer
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className='max-w-7xl mx-auto'>
          <div className='grid md:grid-cols-4 gap-8 mb-8'>
            <div>
              <div className='mb-4'>
                <AnomathLogo
                  size='md'
                  wordmarkVariant='solid'
                  wordmarkClassName='text-lg'
                />
              </div>
              <p className='text-gray-600 text-sm'>
                Making math learning fun through detective adventures
              </p>
            </div>

            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'Case Studies', 'Updates'],
              },
              {
                title: 'Resources',
                links: [
                  'Documentation',
                  'Help Center',
                  'Teacher Guide',
                  'Blog',
                ],
              },
              {
                title: 'Company',
                links: ['About', 'Careers', 'Contact', 'Privacy'],
              },
            ].map((column) => (
              <div key={column.title}>
                <h4 className='font-bold text-gray-900 mb-4'>{column.title}</h4>
                <ul className='space-y-2'>
                  {column.links.map((link) => (
                    <li key={link}>
                      <Link
                        to='/login'
                        className='text-gray-600 hover:text-gray-900 text-sm transition-colors'
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className='border-t border-gray-200 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600'>
            <p>&copy; 2026 Anomath. All rights reserved.</p>
            <div className='flex gap-6'>
              <Link
                to='/login'
                className='hover:text-gray-900 transition-colors'
              >
                Terms
              </Link>
              <Link
                to='/login'
                className='hover:text-gray-900 transition-colors'
              >
                Privacy
              </Link>
              <Link
                to='/login'
                className='hover:text-gray-900 transition-colors'
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
