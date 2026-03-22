import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnomathLogo } from '@/components/branding/anomath-logo';
import { ANOMATH_TAGLINE } from '@/lib/branding';
import { login as apiLogin, saveAuthSession } from '@/lib/api/auth';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    typeof location.state?.from === 'string' &&
    location.state.from.startsWith('/')
      ? location.state.from
      : null;

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const loadingId = toast.loading('Memproses login…');
    try {
      const data = await apiLogin({ email, password });
      saveAuthSession(data);
      toast.dismiss(loadingId);
      toast.success('Login berhasil. Selamat datang kembali!');
      if (redirectTo) {
        return navigate(redirectTo, { replace: true });
      }
      const role = String(data.user?.role || '')
        .toLowerCase()
        .trim();
      if (role === 'student') return navigate('/student', { replace: true });
      if (role === 'teacher') return navigate('/teacher', { replace: true });
      if (role === 'admin') return navigate('/admin', { replace: true });
      return navigate('/', { replace: true });
    } catch (err) {
      toast.dismiss(loadingId);
      toast.error(
        err instanceof Error ? err.message : 'Login gagal. Coba lagi.',
      );
    }
  }

  return (
    <div className='min-h-svh bg-linear-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden'>
      {/* Background Decorations */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-20 -left-20 w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-30' />
        <div className='absolute bottom-20 -right-20 w-80 h-80 bg-blue-200 rounded-full blur-3xl opacity-30' />
        <div className='absolute top-1/2 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 bg-pink-200 rounded-full blur-3xl opacity-20' />
      </div>

      <div className='w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10'>
        {/* Left Side - Branding */}
        <div className='hidden lg:block'>
          <AnomathLogo size='lg' tagline={ANOMATH_TAGLINE} className='mb-8' />

          <h2 className='text-5xl font-bold mb-6 text-gray-900 leading-tight'>
            Welcome Back,
            <br />
            <span className='bg-linear-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent'>
              Detective!
            </span>
          </h2>

          <p className='text-xl text-gray-600 mb-8'>
            Continue your math detective journey and unlock new mysteries.
          </p>

          <div className='space-y-4'>
            {[
              { icon: '🎯', text: 'Track your progress' },
              { icon: '🏆', text: 'Earn badges and rewards' },
              { icon: '📊', text: 'Climb the leaderboard' },
            ].map((item) => (
              <div key={item.text} className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-xl'>
                  {item.icon}
                </div>
                <span className='text-gray-700 font-medium'>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className='w-full'>
          <Card className='rounded-3xl p-0 py-0 border border-gray-200 shadow-2xl'>
            <CardContent className='p-8 sm:p-10'>
              <div className='mb-2'>
                <h3 className='text-2xl font-bold text-gray-900 mb-2'>
                  Sign In
                </h3>
                <p className='text-gray-600 mb-8'>
                  Login to your Anomath account
                </p>
              </div>

              <form onSubmit={handleSubmit} className='space-y-6'>
                {/* Email Input */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='email'
                    className='text-sm font-semibold text-gray-700'
                  >
                    Email Address
                  </Label>
                  <div className='relative'>
                    <Mail className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                    <Input
                      id='email'
                      name='email'
                      type='email'
                      placeholder='Masukkan email Anda'
                      className='pl-11 pr-4 py-3.5 h-11 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-purple-300'
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='password'
                    className='text-sm font-semibold text-gray-700'
                  >
                    Password
                  </Label>
                  <div className='relative'>
                    <Lock className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                    <Input
                      id='password'
                      name='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Masukkan password Anda'
                      className='pl-11 pr-12 py-3.5 h-11 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-purple-300'
                      required
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword((prev) => !prev)}
                      className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className='w-5 h-5' />
                      ) : (
                        <Eye className='w-5 h-5' />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className='flex items-center justify-between gap-4'>
                  <label className='flex items-center gap-2 cursor-pointer text-sm text-gray-600'>
                    <input
                      type='checkbox'
                      className='w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-300'
                    />
                    <span>Remember me</span>
                  </label>
                  <Link
                    to='/'
                    className='text-sm text-purple-600 hover:text-purple-700 font-semibold'
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Login Button */}
                <Button
                  type='submit'
                  variant='ghost'
                  className='w-full py-4 bg-linear-to-r from-purple-300 to-blue-300 text-purple-700 rounded-xl font-bold text-lg hover:bg-transparent hover:text-purple-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5'
                >
                  Sign In
                </Button>

                {/* Sign Up Link */}
                <div className='mt-2 text-center'>
                  <p className='text-gray-600'>
                    Don't have an account?{' '}
                    <Link
                      to='/register'
                      className='text-purple-600 hover:text-purple-700 font-semibold'
                    >
                      Sign up free
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
