import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MaintenancePage() {
  return (
    <div className='min-h-screen bg-linear-to-br from-slate-50 to-purple-50 flex items-center justify-center p-6'>
      <Card className='w-full max-w-md border border-gray-200 shadow-lg'>
        <CardHeader className='text-center space-y-2'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700'>
            <Construction className='h-8 w-8' aria-hidden />
          </div>
          <CardTitle className='text-2xl'>Sedang pemeliharaan</CardTitle>
          <CardDescription className='text-base'>
            Kami sedang memperbarui Anomath. Silakan coba lagi nanti.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex justify-center pb-6'>
          <Button variant='outline' asChild>
            <Link to='/'>Kembali ke beranda</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
