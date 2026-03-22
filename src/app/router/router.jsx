import LoginPage from '@/features/auth/page/LoginPage';
import RegisterPage from '@/features/auth/page/RegisterPage';
import HomePage from '@/features/home/HomePage';
import StudentDashboard from '@/features/student/StudentDashboard';
import PuzzleGame from '@/features/student/PuzzleGame';
import CaseStory from '@/features/student/CaseStory';
import CaseBriefing from '@/features/student/CaseBriefing';
import InvestigationBoard from '@/features/student/InvestigationBoard';
import FinalDeduction from '@/features/student/FinalDeduction';
import CaseResult from '@/features/student/CaseResult';
import TeacherDashboard from '@/features/teacher/TeacherDashboard';
import ClassManagement from '@/features/teacher/ClassManagement';
import TeacherClassDetail from '@/features/teacher/TeacherClassDetail';
import CaseBuilder from '@/features/teacher/CaseBuilder';
import PuzzleBuilder from '@/features/teacher/PuzzleBuilder';
import StudentPerformance from '@/features/teacher/StudentPerformance';
import AdminDashboard from '@/features/admin/AdminDashboard';
import AdminLayout from '@/features/admin/AdminLayout';
import AdminClassManagement from '@/features/admin/AdminClassManagement';
import AdminClassPublicReview from '@/features/admin/AdminClassPublicReview';
import AdminLeaderboardMonitoring from '@/features/admin/AdminLeaderboardMonitoring';
import AdminSettings from '@/features/admin/AdminSettings';
import AdminUserManagement from '@/features/admin/AdminUserManagement';
import MaintenancePage from '@/features/system/MaintenancePage';
import NotFoundPage from '@/features/system/NotFoundPage';
import UnauthorizedPage from '@/features/system/UnauthorizedPage';
import ProtectedRoute from '@/app/router/ProtectedRoute';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';


const maintenanceMode = import.meta.env.VITE_MAINTENANCE === 'true';

export default function AppRouter() {
  if (maintenanceMode) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path='*' element={<MaintenancePage />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/maintenance' element={<MaintenancePage />} />
        <Route path='/unauthorized' element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path='/student' element={<StudentDashboard />} />
          <Route path='/case/:caseId' element={<CaseBriefing />} />
          <Route path='/case/:caseId/story' element={<CaseStory />} />
          <Route path='/puzzle/:caseId' element={<PuzzleGame />} />
          <Route path='/case/:caseId/board' element={<InvestigationBoard />} />
          <Route path='/case/:caseId/final' element={<FinalDeduction />} />
          <Route path='/case/:caseId/result' element={<CaseResult />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path='/teacher' element={<TeacherDashboard />} />
          <Route path='/teacher/classes' element={<ClassManagement />} />
          <Route path='/teacher/classes/:classCode' element={<TeacherClassDetail />} />
          <Route path='/teacher/case-builder' element={<CaseBuilder />} />
          <Route path='/teacher/puzzle-builder' element={<PuzzleBuilder />} />
          <Route path='/teacher/performance' element={<StudentPerformance />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path='/admin' element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path='cases' element={<Navigate to='/admin/classes' replace />} />
            <Route path='classes' element={<AdminClassManagement />} />
            <Route path='class-review' element={<AdminClassPublicReview />} />
            <Route path='leaderboard' element={<AdminLeaderboardMonitoring />} />
            <Route path='puzzles' element={<Navigate to='/admin/classes' replace />} />
            <Route path='settings' element={<AdminSettings />} />
            <Route path='users' element={<AdminUserManagement />} />
          </Route>
        </Route>

        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
