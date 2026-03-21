import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardPathForRole } from '@/lib/auth/session';

export default function UnauthorizedPage() {
  const dashboard = getDashboardPathForRole();

  return (
    <div className='min-h-screen bg-linear-to-br from-slate-50 to-purple-50 flex items-center justify-center p-6'>
      <Card className='w-full max-w-md border border-gray-200 shadow-lg'>
        <CardHeader className='text-center space-y-2'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700'>
            <ShieldAlert className='h-8 w-8' aria-hidden />
          </div>
          <CardTitle className='text-2xl'>Akses ditolak</CardTitle>
          <CardDescription className='text-base'>
            Anda tidak memiliki izin untuk membuka halaman ini. Pastikan Anda masuk dengan akun yang sesuai peran
            (murid, guru, atau admin).
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 sm:flex-row sm:justify-center pb-6'>
          {dashboard ? (
            <Button asChild>
              <Link to={dashboard}>Ke dashboard saya</Link>
            </Button>
          ) : null}
          <Button variant='outline' asChild>
            <Link to='/'>Beranda</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
