import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { hasRole, isAuthenticated } from '@/lib/auth/session';

/**
 * Wajib login. Jika `allowedRoles` diisi, role harus salah satunya — selain itu ke /unauthorized (bukan 404).
 */
export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles?.length && !hasRole(allowedRoles)) {
    return <Navigate to='/unauthorized' replace />;
  }

  return <Outlet />;
}
