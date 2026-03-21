import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ClipboardCheck, ShieldCheck, Timer } from 'lucide-react';
import { toast } from 'sonner';

import { AnomathLogo } from '@/components/branding/anomath-logo';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCase } from '@/lib/api/cases';

export default function CaseBriefing() {
  const { caseId } = useParams();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    getCase(caseId)
      .then((data) => {
        if (!cancelled && data) setTitle(data.title || '');
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Gagal memuat case');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  return (
    <div className='min-h-screen bg-[#f8f9ff]'>
      <nav className='bg-white border-b sticky top-0 z-50'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2'>
          <Link to='/student' className='inline-flex items-center gap-2 justify-self-start text-gray-600 hover:text-purple-600'>
            <ArrowLeft className='w-5 h-5 shrink-0' />
            Back
          </Link>
          <div className='justify-self-center'>
            <AnomathLogo size='sm' wordmarkVariant='brand' />
          </div>
          <div className='justify-self-end'>
            <LogoutButton className='shrink-0 rounded-full border-0 bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 hover:opacity-95' variant='ghost' size='sm' />
          </div>
        </div>
      </nav>

      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
        <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100'>
          <CardContent className='p-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Case Briefing</h1>
            <p className='text-gray-700'>
              Selamat datang, Detective. Sebelum mulai, pahami aturan investigasi untuk{' '}
              {loading ? '…' : title || `Case ${caseId}`}.
            </p>
          </CardContent>
        </Card>

        <Card className='rounded-2xl border border-gray-200'>
          <CardContent className='p-6 space-y-4'>
            {[
              {
                icon: ClipboardCheck,
                title: 'Solve the puzzles',
                text: 'Setiap puzzle matematika akan membuka petunjuk baru.',
              },
              {
                icon: BookOpen,
                title: 'Collect all clues',
                text: 'Gabungkan petunjuk dari tiap stage untuk memahami pola kasus.',
              },
              {
                icon: ShieldCheck,
                title: 'Make final deduction',
                text: 'Tentukan pelaku / kode rahasia berdasarkan bukti, bukan tebakan.',
              },
              {
                icon: Timer,
                title: 'Work carefully',
                text: 'Jawaban final yang salah akan menghasilkan case failed report.',
              },
            ].map((rule) => {
              const Icon = rule.icon;
              return (
                <div key={rule.title} className='flex items-start gap-3 p-4 bg-gray-50 rounded-xl'>
                  <div className='w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center'>
                    <Icon className='w-5 h-5 text-purple-600' />
                  </div>
                  <div>
                    <p className='font-semibold text-gray-900'>{rule.title}</p>
                    <p className='text-sm text-gray-600'>{rule.text}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className='flex justify-end'>
          <Button asChild className='bg-linear-to-r from-purple-300 to-blue-300 text-purple-700'>
            <Link to={`/case/${caseId}/story`}>Read Case Story</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
