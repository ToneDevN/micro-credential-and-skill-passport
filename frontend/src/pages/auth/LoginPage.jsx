import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setValidated(true);
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'instructor') {
        navigate('/instructor/courses');
      } else {
        navigate('/student/passport');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setError('');
  };

  return (
    <div className="stitch-auth-wrapper">
      <div className="stitch-card">
        {/* LEFT PANEL (~45% width) */}
        <section className="stitch-left-panel">
          {/* Ambient Decorative Radial Accents */}
          <div className="stitch-glow-1"></div>
          <div className="stitch-glow-2"></div>

          {/* Top Content */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div className="stitch-badge-pill">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                stars
              </span>
              <span className="stitch-badge-text">
                Verified Credential Network
              </span>
            </div>
            <h1 className="stitch-left-title">
              Earn and Showcase Your Skills with Skill Passport
            </h1>
            <p className="stitch-left-subtitle">
              Submit evidence, get certified by instructors, collect digital badges
            </p>
          </div>

          {/* Center 3D Illustration Graphic */}
          <div className="stitch-illustration-card">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxkPLZFYijE-V_k-wVqKplw5ygi-qsLByN5UA8eFs8VdsADxmPSMHwC_h4alk_znH3dMaaVqv7iqh2s8PIttdAa1eZi_2xQ7U9k0NkYnCjl0AnKsEv0oKqD746jicL1NJSLXAT1tQ0pTecc59JnrvQJQaC7hqwZUbg77MRxAC8C9zVcnUJB9Wt01kNTg2EDDtLCIkO3oBZ-9p3Oc-LHa5XJb-ZMuRpcgFWCmydB0VM1s3nsumUiphQiUWTs4htWcUT7v2LAmUtx4W4"
              alt="Student with credentials"
            />
          </div>

          {/* Bottom Micro-badges & Verification Chips */}
          <div className="stitch-chips-group">
            <div className="stitch-chip-item">
              <span className="material-symbols-outlined">verified_user</span>
              <span>W3C Verifiable Credentials</span>
            </div>
            <div className="stitch-chip-item">
              <span className="material-symbols-outlined">token</span>
              <span>Portable Digital Badges</span>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL (~55% width) */}
        <section className="stitch-right-panel">
          <div className="stitch-right-content">
            {/* Top Center Brand Mark */}
            <div className="stitch-brand-header">
              <div className="stitch-brand-icon-box">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <span className="stitch-brand-name">Skill Passport</span>
            </div>

            {/* Heading & Subtitle */}
            <div className="stitch-form-header">
              <h2 className="stitch-form-title">Welcome Back</h2>
              <p className="stitch-form-desc">Please login to your account</p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="stitch-alert-box" role="alert">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Email Field */}
              <div className="stitch-form-group">
                <label className="stitch-field-label" htmlFor="email">
                  Email
                </label>
                <div className="stitch-input-container">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`stitch-form-input ${
                      validated && !email ? 'is-invalid' : ''
                    }`}
                    placeholder="name@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {validated && !email && (
                  <div className="stitch-error-feedback">Please enter your email address.</div>
                )}
              </div>

              {/* Password Field */}
              <div className="stitch-form-group">
                <label className="stitch-field-label" htmlFor="password">
                  Password
                </label>
                <div className="stitch-input-container">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`stitch-form-input has-toggle ${
                      validated && !password ? 'is-invalid' : ''
                    }`}
                    placeholder="Enter your security credential"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    id="togglePassword"
                    type="button"
                    className="stitch-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {validated && !password && (
                  <div className="stitch-error-feedback">Please enter your password.</div>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="stitch-forgot-wrap">
                <a href="#forgot" className="stitch-text-link">
                  Forgot Password?
                </a>
              </div>

              {/* Submission Button */}
              <button
                type="submit"
                className="stitch-submit-btn"
                disabled={loading}
              >
                <span>{loading ? 'Logging in...' : 'Login'}</span>
                {!loading && (
                  <span className="material-symbols-outlined">arrow_forward</span>
                )}
              </button>
            </form>

            {/* Quick Autofill for testing */}
            <div className="stitch-quickfill-box">
              <div className="stitch-quickfill-title">Quick Demo Login</div>
              <div className="stitch-quickfill-buttons">
                <button
                  type="button"
                  onClick={() => fillQuickAccount('instructor@test.com', 'password123')}
                  className="stitch-quick-btn"
                >
                  Instructor
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAccount('student1@test.com', 'password123')}
                  className="stitch-quick-btn"
                >
                  Student
                </button>
              </div>
            </div>

            {/* Switch Account Link */}
            <div className="stitch-account-switch">
              Don't have an account?{' '}
              <Link to="/register" className="stitch-text-link">
                Register
              </Link>
            </div>

            {/* Minimal Security Assurance Footer Note */}
            <div className="stitch-security-badge">
              <span className="material-symbols-outlined">lock</span>
              <span>End-to-end cryptographic handshake enabled</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
