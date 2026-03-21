import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { clearAuthSession } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

/**
 * Hapus sesi lokal (token + user) lalu redirect ke login.
 */
export function LogoutButton({ className, variant = 'outline', size = 'default' }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearAuthSession();
    try {
      localStorage.removeItem('anomath_student_subscription');
      localStorage.removeItem('anomath_teacher_subscription');
    } catch {
      /* ignore */
    }
    toast.success('Anda telah keluar.');
    navigate('/login', { replace: true });
  }

  return (
    <Button
      type='button'
      variant={variant}
      size={size}
      className={cn('gap-2 font-semibold', className)}
      onClick={handleLogout}
      aria-label='Keluar dari akun'
    >
      <LogOut className='h-4 w-4 shrink-0' aria-hidden />
      Keluar
    </Button>
  );
}
