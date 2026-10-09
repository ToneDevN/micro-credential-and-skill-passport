import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    connected: false,
    data: null,
    error: null,
  });

  const checkHealth = async () => {
    setBackendStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await api.get('/health');
      setBackendStatus({
        loading: false,
        connected: true,
        data: res.data,
        error: null,
      });
    } catch (err) {
      setBackendStatus({
        loading: false,
        connected: false,
        data: null,
        error: err.message || 'Cannot connect to backend server',
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="container py-5">
      <div className="p-5 mb-4 bg-light rounded-3 shadow-sm border">
        <div className="container-fluid py-2">
          <h1 className="display-5 fw-bold text-primary">
            Micro-credential & Skill Passport System
          </h1>
          <p className="col-md-9 fs-5 text-muted">
            ระบบจัดการและตรวจสอบทักษะ (Skill Passport) และใบรับรองย่อย (Micro-credentials)
            ที่พัฒนาด้วย MERN Stack (MongoDB, Express, React, Node.js + Bootstrap 5).
          </p>

          <div className="d-flex gap-2 mt-4">
            {isAuthenticated ? (
              <span className="btn btn-primary disabled">
                Logged in as {user?.name} ({user?.role})
              </span>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary btn-lg px-4">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-outline-secondary btn-lg px-4">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Backend API Health Status */}
        <div className="col-md-6">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
              <span>Backend API Health Check</span>
              <button
                onClick={checkHealth}
                className="btn btn-sm btn-outline-primary"
                disabled={backendStatus.loading}
              >
                {backendStatus.loading ? 'Checking...' : 'Refresh'}
              </button>
            </div>
            <div className="card-body">
              {backendStatus.loading ? (
                <div className="spinner-border text-primary spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : backendStatus.connected ? (
                <div>
                  <div className="alert alert-success py-2 mb-3">
                    <strong>Online</strong>: Connection established successfully!
                  </div>
                  <ul className="list-group list-group-flush small">
                    <li className="list-group-item d-flex justify-content-between">
                      <span className="text-muted">Status:</span>
                      <span className="badge bg-success">{backendStatus.data?.status}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span className="text-muted">MongoDB:</span>
                      <span className="badge bg-info text-dark">
                        {backendStatus.data?.dbState || 'unknown'}
                      </span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span className="text-muted">API Base URL:</span>
                      <code>{import.meta.env.VITE_API_BASE_URL || 'http://192.168.137.10:5001/api/v1'}</code>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="alert alert-warning mb-0">
                  <strong>Backend Offline:</strong> {backendStatus.error}
                  <div className="small mt-2 text-muted">
                    Start backend with <code>npm run dev</code> inside <code>backend/</code> or via <code>docker compose up</code>.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Demo Accounts Card */}
        <div className="col-md-6">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header bg-white fw-bold">
              <span>Seeded Test Accounts (TON-55)</span>
            </div>
            <div className="card-body">
              <p className="text-muted small">
                คุณสามารถใช้บัญชีทดสอบที่ถูก Seed ไว้ในฐานข้อมูลเพื่อเข้าสู่ระบบ:
              </p>
              <div className="table-responsive">
                <table className="table table-sm table-bordered align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="badge bg-warning text-dark">Instructor</span></td>
                      <td><code>instructor@test.com</code></td>
                      <td><code>password123</code></td>
                    </tr>
                    <tr>
                      <td><span className="badge bg-primary">Student</span></td>
                      <td><code>student1@test.com</code></td>
                      <td><code>password123</code></td>
                    </tr>
                    <tr>
                      <td><span className="badge bg-primary">Student</span></td>
                      <td><code>student2@test.com</code></td>
                      <td><code>password123</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
