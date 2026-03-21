import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ClipboardCheck,
  GraduationCap,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';

import { AnomathLogo } from '@/components/branding/anomath-logo';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { getAdminPageTitle } from '@/lib/admin-page-meta';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin', icon: BarChart3, exact: true },
  { label: 'Pengguna', to: '/admin/users', icon: Users },
  { label: 'Kelas', to: '/admin/classes', icon: GraduationCap },
  { label: 'Review kelas', to: '/admin/class-review', icon: ClipboardCheck },
  { label: 'Leaderboard', to: '/admin/leaderboard', icon: Trophy },
  { label: 'Pengaturan', to: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const title = getAdminPageTitle(location.pathname);
  const [headerActions, setHeaderActions] = useState(null);

  return (
    <div className='flex min-h-screen bg-white'>
      <aside className='hidden min-h-screen w-64 flex-col border-r border-gray-200 bg-linear-to-b from-purple-50 to-blue-50 lg:flex'>
        <div className='flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-6'>
          <AnomathLogo size='md' wordmarkVariant='solid' />
        </div>

        <nav className='flex-1 space-y-2 p-4'>
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Button
                key={item.to}
                asChild
                variant={active ? 'secondary' : 'ghost'}
                className='w-full justify-start'
              >
                <Link to={item.to}>
                  <Icon className='mr-2 h-4 w-4' />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='relative z-20 flex min-h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-2.5 lg:px-6'>
          <h1 className='min-w-0 flex-1 truncate text-lg font-bold text-gray-900'>
            {title}
          </h1>
          <div className='flex shrink-0 items-center gap-2'>
            {headerActions}
            <LogoutButton
              className='shrink-0 border-gray-200 bg-white hover:bg-gray-50'
              variant='outline'
            />
          </div>
        </header>
        <div className='min-h-0 flex-1 overflow-auto'>
          <Outlet context={{ setHeaderActions }} />
        </div>
      </div>
    </div>
  );
}
