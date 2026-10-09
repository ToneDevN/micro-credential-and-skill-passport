import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickAccount = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h3 className="card-title text-center fw-bold mb-4 text-primary">
                Sign In
              </h3>

              {error && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 mt-2"
                  disabled={submitting}
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-4 pt-3 border-top text-center">
                <p className="small text-muted mb-2">Quick autofill for testing:</p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    onClick={() => fillQuickAccount('instructor@test.com', 'password123')}
                    className="btn btn-sm btn-outline-secondary"
                  >
                    Instructor
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickAccount('student1@test.com', 'password123')}
                    className="btn btn-sm btn-outline-secondary"
                  >
                    Student
                  </button>
                </div>
              </div>

              <div className="text-center mt-3 small text-muted">
                Don't have an account? <Link to="/register">Register here</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
