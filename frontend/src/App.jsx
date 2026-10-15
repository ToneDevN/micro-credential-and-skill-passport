import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Toast,
  ToastContent,
  ToastDescription,
  ToastIndicator,
  ToastTitle,
  toastQueue,
} from '@heroui/react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PublicPassportPage from './pages/PublicPassportPage';
import SkillExplorePage from './pages/student/SkillExplorePage';
import SubmitVerificationPage from './pages/student/SubmitVerificationPage';
import MyVerificationRequestsPage from './pages/student/MyVerificationRequestsPage';
import PassportDashboardPage from './pages/student/PassportDashboardPage';
import CourseManagementPage from './pages/instructor/CourseManagementPage';
import SkillManagementPage from './pages/instructor/SkillManagementPage';
import VerificationReviewPage from './pages/instructor/VerificationReviewPage';
import AnalyticsDashboardPage from './pages/instructor/AnalyticsDashboardPage';
// Deferred to v2 (TON-221): import EnrolledStudentsPage from './pages/instructor/EnrolledStudentsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';

function AppLayout() {
  const location = useLocation();
  const isPublicPassport = location.pathname.startsWith('/passport/');

  if (isPublicPassport) {
    return (
      <Routes>
        <Route path="/passport/:slug" element={<PublicPassportPage />} />
        <Route path="*" element={<Navigate to="/explore" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/explore" replace />} />
          <Route path="/explore" element={<SkillExplorePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Student Routes (US-01, US-03, TON-45, TON-46) */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/dashboard" element={<Navigate to="/student/passport" replace />} />
            <Route path="/student/submit-verification" element={<SubmitVerificationPage />} />
            <Route path="/student/my-requests" element={<MyVerificationRequestsPage />} />
            <Route path="/student/verification-requests" element={<Navigate to="/student/my-requests" replace />} />
            <Route path="/student/passport" element={<PassportDashboardPage />} />
          </Route>

          {/* Protected Instructor Routes (US-02, US-03, TON-47, TON-48, TON-49) */}
          <Route element={<ProtectedRoute allowedRoles={['instructor']} />}>
            <Route path="/instructor/dashboard" element={<Navigate to="/instructor/courses" replace />} />
            <Route path="/instructor/courses" element={<CourseManagementPage />} />
            <Route path="/instructor/courses/:courseId/skills" element={<SkillManagementPage />} />
            <Route path="/instructor/courses/:courseId/students" element={<Navigate to="/instructor/courses" replace />} />
            <Route path="/instructor/requests" element={<VerificationReviewPage />} />
            <Route path="/instructor/requests/:id" element={<VerificationReviewPage />} />
            <Route path="/instructor/analytics" element={<AnalyticsDashboardPage />} />
          </Route>

          {/* Shared Authenticated Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student', 'instructor']} />}>
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toast.Provider placement="bottom end" queue={toastQueue}>
        {({ toast: toastItem }) => {
          const content = toastItem.content || {};

          return (
            <Toast
              className="rounded-xl border border-slate-200/90 bg-white shadow-xl px-4 py-3 min-w-[320px] max-w-md pointer-events-auto relative"
              toast={toastItem}
              variant={content.variant}
            >
              <ToastContent className="flex-1 pr-6">
                <div className="flex items-start gap-2.5">
                  <ToastIndicator
                    className="mt-0.5 shrink-0"
                    variant={content.variant}
                  />
                  <div className="flex flex-col">
                    {content.title ? (
                      <ToastTitle className="text-sm font-semibold text-slate-900 leading-snug">
                        {content.title}
                      </ToastTitle>
                    ) : null}
                    {content.description ? (
                      <ToastDescription className="text-xs text-slate-600 mt-0.5 leading-normal">
                        {content.description}
                      </ToastDescription>
                    ) : null}
                  </div>
                </div>
              </ToastContent>
              <Toast.CloseButton className="absolute end-2 top-3 border-none bg-transparent opacity-70 hover:opacity-100 transition-opacity [&>svg]:size-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1" />
            </Toast>
          );
        }}
      </Toast.Provider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
