import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Construction, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { clearAuthSession } from '@/lib/auth/session';

function clearClientSessionExtras() {
  try {
    localStorage.removeItem('anomath_student_subscription');
    localStorage.removeItem('anomath_teacher_subscription');
  } catch {
    /* ignore */
  }
}

export default function MaintenancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const code = searchParams.get('code');
  const network = searchParams.get('network') === '1';
  const isServerError = reason === 'server';

  function handleLogoutAndLogin() {
    clearAuthSession();
    clearClientSessionExtras();
    toast.success('Sesi dihapus. Silakan masuk lagi.');
    navigate('/login', { replace: true });
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-purple-50 p-6'>
      <Card className='w-full max-w-md border border-gray-200 shadow-lg'>
        <CardHeader className='space-y-2 text-center'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700'>
            <Construction className='h-8 w-8' aria-hidden />
          </div>
          <CardTitle className='text-2xl'>
            {isServerError ? 'Gangguan server' : 'Sedang pemeliharaan'}
          </CardTitle>
          <CardDescription className='text-base'>
            {isServerError ? (
              network ? (
                <>
                  Tidak ada jawaban dari server (koneksi terputus atau backend
                  tidak jalan). Periksa jaringan atau coba lagi nanti. Anda bisa
                  keluar lalu masuk ulang.
                </>
              ) : (
                <>
                  Layanan mengalami gangguan di sisi server
                  {code ? ` (HTTP ${code})` : ''}.
                  Ini bukan kesalahan perangkat Anda. Coba lagi nanti; Anda juga
                  bisa keluar lalu login ulang.
                </>
              )
            ) : (
              <>
                Kami sedang memperbarui Anomath. Silakan coba lagi nanti.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pb-6 sm:flex-row sm:flex-wrap sm:justify-center'>
          {isServerError ? (
            <>
              <Button
                type='button'
                className='rounded-full bg-linear-to-r from-purple-200 to-blue-200 text-purple-900'
                onClick={handleLogoutAndLogin}
              >
                <LogOut className='mr-2 h-4 w-4' aria-hidden />
                Keluar & ke login
              </Button>
              <Button variant='outline' className='rounded-full' asChild>
                <Link to='/login' replace>
                  <LogIn className='mr-2 h-4 w-4' aria-hidden />
                  Coba login lagi
                </Link>
              </Button>
            </>
          ) : (
            <Button variant='outline' className='rounded-full' asChild>
              <Link to='/'>Kembali ke beranda</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
