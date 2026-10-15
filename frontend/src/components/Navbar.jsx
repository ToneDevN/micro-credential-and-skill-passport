import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@heroui/react';
import { useAuth } from '../context/AuthContext';
import { toastSuccess } from '../utils/toast.js';
import NotificationBell from './NotificationBell';
import ProfilePopover from './ProfilePopover';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toastSuccess('ออกจากระบบแล้ว', 'กลับมาใหม่เมื่อพร้อม');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand Logo Left */}
        <Link className="flex items-center gap-2 text-slate-900 font-bold text-lg hover:text-primary transition-colors" to="/explore">
          <span
            className="material-symbols-outlined text-primary text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          <span className="font-heading font-bold text-slate-900 text-lg">Skill Passport</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 h-full">
          <Link
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive('/explore')
                ? 'text-primary bg-primary/10 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            to="/explore"
          >
            Explore
          </Link>

          {isAuthenticated && user?.role === 'instructor' && (
            <>
              <Link
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/instructor/courses')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                to="/instructor/courses"
              >
                My Courses
              </Link>
              <Link
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/instructor/requests')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                to="/instructor/requests"
              >
                Requests
              </Link>
              <Link
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/instructor/analytics')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                to="/instructor/analytics"
              >
                Analytics
              </Link>
            </>
          )}

          {isAuthenticated && user?.role === 'student' && (
            <>
              <Link
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/student/passport')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                to="/student/passport"
              >
                Passport
              </Link>
              <Link
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/student/my-requests') || isActive('/student/submit-verification')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                to="/student/my-requests"
              >
                My Requests
              </Link>
            </>
          )}
        </nav>

        {/* Trailing Section / User Profile */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Notifications Bell */}
              <NotificationBell />

              {/* Profile Popover with Settings & Logout */}
              <ProfilePopover onLogout={handleLogout} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="light"
                size="sm"
                className="hidden sm:inline-flex text-xs font-medium"
                onPress={() => navigate('/login')}
              >
                Sign In
              </Button>
              <Button
                color="primary"
                size="sm"
                className="hidden sm:inline-flex text-xs font-medium shadow-xs"
                onPress={() => navigate('/register')}
              >
                Register
              </Button>
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden flex flex-col p-4 border-t border-slate-200 bg-white gap-1 shadow-md">
          <Link
            to="/explore"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/explore') ? 'text-primary bg-primary/10 font-semibold' : 'text-slate-600'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Explore Skills
          </Link>

          {isAuthenticated && user?.role === 'instructor' && (
            <>
              <Link
                to="/instructor/courses"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/instructor/courses')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Courses
              </Link>
              <Link
                to="/instructor/requests"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/instructor/requests')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Requests
              </Link>
              <Link
                to="/instructor/analytics"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/instructor/analytics')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Analytics
              </Link>
            </>
          )}

          {isAuthenticated && user?.role === 'student' && (
            <>
              <Link
                to="/student/passport"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/student/passport')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Passport
              </Link>
              <Link
                to="/student/my-requests"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/student/my-requests')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Requests
              </Link>
            </>
          )}

          {isAuthenticated && (
            <>
              <Link
                to="/notifications"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/notifications')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Notifications
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/settings')
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-slate-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
            </>
          )}

          <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col gap-2">
            {!isAuthenticated ? (
              <>
                <Button
                  variant="flat"
                  fullWidth
                  onPress={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  Sign In
                </Button>
                <Button
                  color="primary"
                  fullWidth
                  onPress={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                >
                  Register
                </Button>
              </>
            ) : (
              <Button
                color="danger"
                variant="flat"
                fullWidth
                onPress={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                startContent={<span className="material-symbols-outlined text-[18px]">logout</span>}
              >
                Logout ({user?.name || user?.role})
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
