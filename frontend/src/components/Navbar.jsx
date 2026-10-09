import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dashboardPath =
    user?.role === 'instructor'
      ? '/instructor/dashboard'
      : '/student/dashboard';

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  const isActive = (path) => location.pathname === path;

  return (
    <header className="stitch-navbar-header">
      <div className="stitch-navbar-container">
        {/* Brand Logo Left */}
        <Link className="stitch-brand" to="/">
          <span
            className="material-symbols-outlined stitch-brand-logo-icon"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          <span>Skill Passport</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav>
          <ul className="stitch-nav-links">
            <li className="stitch-nav-item">
              <Link
                className={`stitch-nav-link ${isActive('/explore') ? 'active' : ''}`}
                to="/explore"
              >
                Explore
              </Link>
            </li>
            <li className="stitch-nav-item">
              <Link
                className={`stitch-nav-link ${isActive('/') ? 'active' : ''}`}
                to="/"
              >
                Home
              </Link>
            </li>
            {isAuthenticated && (
              <li className="stitch-nav-item">
                <Link
                  className={`stitch-nav-link ${isActive(dashboardPath) ? 'active' : ''}`}
                  to={dashboardPath}
                >
                  {user?.role === 'instructor' ? 'Instructor Portal' : 'My Dashboard'}
                </Link>
              </li>
            )}
            {isAuthenticated && user?.role === 'instructor' && (
              <>
                <li className="stitch-nav-item">
                  <Link
                    className={`stitch-nav-link ${isActive('/instructor/courses') ? 'active' : ''}`}
                    to="/instructor/courses"
                  >
                    My Courses
                  </Link>
                </li>
                <li className="stitch-nav-item">
                  <Link
                    className={`stitch-nav-link ${isActive('/instructor/requests') ? 'active' : ''}`}
                    to="/instructor/requests"
                  >
                    Requests
                  </Link>
                </li>
                <li className="stitch-nav-item">
                  <Link
                    className={`stitch-nav-link ${isActive('/instructor/analytics') ? 'active' : ''}`}
                    to="/instructor/analytics"
                  >
                    Analytics
                  </Link>
                </li>
              </>
            )}
            {isAuthenticated && user?.role === 'student' && (
              <>
                <li className="stitch-nav-item">
                  <Link
                    className={`stitch-nav-link ${isActive('/student/passport') ? 'active' : ''}`}
                    to="/student/passport"
                  >
                    Passport
                  </Link>
                </li>
                <li className="stitch-nav-item">
                  <Link
                    className={`stitch-nav-link ${isActive('/student/my-requests') || isActive('/student/submit-verification') ? 'active' : ''}`}
                    to="/student/my-requests"
                  >
                    My Requests
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* Trailing Actions / User Profile */}
        <div className="stitch-nav-trailing">
          {isAuthenticated ? (
            <>
              {/* Notifications Icon Button */}
              <button
                type="button"
                className="stitch-nav-bell-btn d-none d-sm-flex"
                aria-label="Notifications"
                title="Notifications"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="stitch-nav-bell-badge"></span>
              </button>

              <div className="stitch-nav-divider d-none d-sm-block"></div>

              {/* User Profile Info */}
              <div className="stitch-user-chip">
                <div className="stitch-user-avatar">{userInitial}</div>
                <div className="stitch-user-info d-none d-md-flex">
                  <span className="stitch-user-name">{user?.name}</span>
                  <span className="stitch-user-role">{user?.role}</span>
                </div>
              </div>

              {/* Logout Action Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="stitch-logout-btn"
                title="Logout"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  logout
                </span>
                <span className="d-none d-sm-inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <Link to="/login" className="stitch-auth-btn-signin">
                Sign In
              </Link>
              <Link to="/register" className="stitch-auth-btn-register">
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className="stitch-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            <span className="material-symbols-outlined">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="stitch-mobile-drawer">
          <Link
            to="/explore"
            className={`stitch-mobile-link ${isActive('/explore') ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Explore Skills
          </Link>
          <Link
            to="/"
            className={`stitch-mobile-link ${isActive('/') ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </Link>
          {isAuthenticated && (
            <Link
              to={dashboardPath}
              className={`stitch-mobile-link ${isActive(dashboardPath) ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard ({user?.role})
            </Link>
          )}
          {isAuthenticated && user?.role === 'instructor' && (
            <>
              <Link
                to="/instructor/courses"
                className={`stitch-mobile-link ${isActive('/instructor/courses') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Courses
              </Link>
              <Link
                to="/instructor/requests"
                className={`stitch-mobile-link ${isActive('/instructor/requests') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Requests
              </Link>
              <Link
                to="/instructor/analytics"
                className={`stitch-mobile-link ${isActive('/instructor/analytics') ? 'active' : ''}`}
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
                className={`stitch-mobile-link ${isActive('/student/passport') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Passport
              </Link>
              <Link
                to="/student/my-requests"
                className={`stitch-mobile-link ${isActive('/student/my-requests') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Requests
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
