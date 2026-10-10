import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SkillExplorePage from './pages/student/SkillExplorePage';
import SubmitVerificationPage from './pages/student/SubmitVerificationPage';
import MyVerificationRequestsPage from './pages/student/MyVerificationRequestsPage';
import PassportDashboardPage from './pages/student/PassportDashboardPage';
import CourseManagementPage from './pages/instructor/CourseManagementPage';
import SkillManagementPage from './pages/instructor/SkillManagementPage';
import VerificationReviewPage from './pages/instructor/VerificationReviewPage';
import AnalyticsDashboardPage from './pages/instructor/AnalyticsDashboardPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-vh-100 d-flex flex-column bg-light">
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/explore" replace />} />
              <Route path="/explore" element={<SkillExplorePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

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
                <Route path="/instructor/requests" element={<VerificationReviewPage />} />
                <Route path="/instructor/analytics" element={<AnalyticsDashboardPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/explore" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
