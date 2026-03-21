import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFoundPage() {
  return (
    <div className='min-h-screen bg-linear-to-br from-slate-50 to-purple-50 flex items-center justify-center p-6'>
      <Card className='w-full max-w-md border border-gray-200 shadow-lg'>
        <CardHeader className='text-center space-y-2'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700'>
            <FileQuestion className='h-8 w-8' aria-hidden />
          </div>
          <CardTitle className='text-2xl'>Halaman tidak ditemukan</CardTitle>
          <CardDescription className='text-base'>
            Alamat yang Anda buka tidak ada atau sudah dipindahkan (404).
          </CardDescription>
        </CardHeader>
        <CardContent className='flex justify-center pb-6'>
          <Button asChild>
            <Link to='/'>Kembali ke beranda</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
