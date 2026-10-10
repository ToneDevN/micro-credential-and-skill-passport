import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const isEmailValid = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isPasswordValid = (val) => val.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidated(true);

    if (!name || !isEmailValid(email) || !isPasswordValid(password) || !role) {
      return;
    }

    setLoading(true);
    try {
      const user = await register(name, email, password, role);
      if (user.role === 'instructor') {
        navigate('/instructor/courses');
      } else {
        navigate('/student/passport');
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('This email address is already registered.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
              <h2 className="stitch-form-title">Create Account</h2>
              <p className="stitch-form-desc">
                Register to start building your skill passport
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="stitch-alert-box" role="alert">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Full Name Field */}
              <div className="stitch-form-group">
                <label className="stitch-field-label" htmlFor="fullname">
                  Full Name
                </label>
                <div className="stitch-input-container">
                  <input
                    id="fullname"
                    name="fullname"
                    type="text"
                    className={`stitch-form-input ${
                      validated && !name ? 'is-invalid' : ''
                    }`}
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                {validated && !name && (
                  <div className="stitch-error-feedback">Full name is required.</div>
                )}
              </div>

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
                      validated && !isEmailValid(email) ? 'is-invalid' : ''
                    }`}
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {validated && !isEmailValid(email) && (
                  <div className="stitch-error-feedback">
                    Please provide a valid email address.
                  </div>
                )}
              </div>

              {/* Password Field with Toggle */}
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
                      validated && !isPasswordValid(password) ? 'is-invalid' : ''
                    }`}
                    placeholder="Password (at least 6 characters)"
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
                {validated && !isPasswordValid(password) && (
                  <div className="stitch-error-feedback">
                    Password must be at least 6 characters.
                  </div>
                )}
              </div>

              {/* Role Selector */}
              <div className="stitch-form-group">
                <label className="stitch-field-label" htmlFor="role">
                  I am a...
                </label>
                <div className="stitch-input-container">
                  <select
                    id="role"
                    name="role"
                    className="stitch-form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="student">Student (Learn and earn badges)</option>
                    <option value="instructor">Instructor (Teach and verify skills)</option>
                  </select>
                </div>
              </div>

              {/* Submission Button */}
              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="stitch-submit-btn"
                  disabled={loading}
                >
                  <span>{loading ? 'Creating account...' : 'Register'}</span>
                  {!loading && (
                    <span className="material-symbols-outlined">arrow_forward</span>
                  )}
                </button>
              </div>
            </form>

            {/* Bottom Alternate Action Link */}
            <div className="stitch-account-switch">
              Already have an account?{' '}
              <Link to="/login" className="stitch-text-link">
                Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;
