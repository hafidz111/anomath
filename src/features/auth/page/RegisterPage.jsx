import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { AnomathLogo } from '@/components/branding/anomath-logo';
import { ANOMATH_TAGLINE } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register as apiRegister, saveAuthSession } from '@/lib/api/auth';

export default function RegisterPage() {
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get('fullName') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');
    const confirmPassword = String(fd.get('confirmPassword') || '');
    if (password !== confirmPassword) {
      toast.error('Password dan konfirmasi password tidak sama.');
      return;
    }
    if (!role || !['student', 'teacher'].includes(role)) {
      toast.error('Pilih peran (Student atau Teacher).');
      return;
    }
    const loadingId = toast.loading('Mendaftarkan akun…');
    try {
      const data = await apiRegister({ name, email, password, role });
      saveAuthSession(data);
      toast.dismiss(loadingId);
      toast.success('Pendaftaran berhasil. Silakan masuk dengan akun Anda.');
      navigate('/login');
    } catch (err) {
      toast.dismiss(loadingId);
      toast.error(
        err instanceof Error ? err.message : 'Pendaftaran gagal. Coba lagi.',
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
            Create your account,
            <br />
            <span className='bg-linear-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent'>
              start the adventure
            </span>
          </h2>

          <p className='text-xl text-gray-600'>
            Choose your role to get the right experience.
          </p>
        </div>

        {/* Right Side - Register Form */}
        <div className='w-full'>
          <Card className='rounded-3xl p-0 border border-gray-200 shadow-2xl'>
            <CardContent className='p-8 sm:p-10'>
              <div className='mb-2'>
                <h3 className='text-2xl font-bold text-gray-900 mb-2'>
                  Create Account
                </h3>
                <p className='text-gray-600 mb-8'>
                  Sign up to your Anomath journey.
                </p>
              </div>

              {/* Role Selection */}
              <div className='grid grid-cols-2 gap-3 mb-8'>
                {[
                  { value: 'student', label: 'Student' },
                  { value: 'teacher', label: 'Teacher' },
                ].map((item) => (
                  <Button
                    key={item.value}
                    type='button'
                    onClick={() => setRole(item.value)}
                    className={`h-auto py-4 rounded-2xl border-2 transition-all ${
                      role === item.value
                        ? 'bg-linear-to-br from-purple-100 to-blue-100 border-purple-300 shadow-md'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    variant='ghost'
                  >
                    <div className='text-sm font-semibold'>{item.label}</div>
                  </Button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className='space-y-6'>
                {/* Full Name */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='fullName'
                    className='text-sm font-semibold text-gray-700'
                  >
                    Full Name
                  </Label>
                  <Input
                    id='fullName'
                    name='fullName'
                    placeholder='Masukkan nama lengkap Anda'
                    required
                    className='pr-4 h-11 bg-gray-50'
                  />
                </div>

                {/* Email */}
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
                      required
                      className='pl-11 pr-4 h-11 bg-gray-50'
                    />
                  </div>
                </div>

                {/* Password */}
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
                      required
                      className='pl-11 pr-12 h-11 bg-gray-50'
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

                {/* Confirm Password */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='confirmPassword'
                    className='text-sm font-semibold text-gray-700'
                  >
                    Confirm Password
                  </Label>
                  <div className='relative'>
                    <Lock className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />

                    <Input
                      id='confirmPassword'
                      name='confirmPassword'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Masukkan ulang password Anda'
                      required
                      className='pl-11 pr-12 h-11 bg-gray-50'
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

                <Button
                  type='submit'
                  variant='ghost'
                  className='w-full py-4 bg-linear-to-r from-purple-300 to-blue-300 text-purple-700 rounded-xl font-bold text-lg hover:bg-transparent hover:text-purple-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5'
                >
                  {role === 'student'
                    ? 'Create Account as Student'
                    : role === 'teacher'
                      ? 'Create Account as Teacher'
                      : 'Create Account'}
                </Button>

                <div className='mt-2 text-center'>
                  <p className='text-gray-600'>
                    Already have an account?{' '}
                    <Link
                      to='/login'
                      className='text-purple-600 hover:text-purple-700 font-semibold'
                    >
                      Sign in
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
