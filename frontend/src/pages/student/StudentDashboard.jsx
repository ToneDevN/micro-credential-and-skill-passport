import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold text-dark mb-1">Student Dashboard</h2>
          <p className="text-muted mb-0">
            Welcome back, <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>
        <span className="badge bg-primary px-3 py-2 text-uppercase fs-6">
          Student Portal
        </span>
      </div>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-primary">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold text-dark mb-0">My Skill Passport</h5>
                <span className="fs-3">🎓</span>
              </div>
              <p className="text-muted small">
                View your earned micro-credential badges and official verifiable skill credentials.
              </p>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <span className="badge bg-primary">Active Passport</span>
                <Link to="/student/passport" className="btn btn-outline-primary btn-sm">
                  View Passport →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-success">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold text-dark mb-0">Enrolled Courses</h5>
                <span className="fs-3">📚</span>
              </div>
              <p className="text-muted small">
                Explore skills assigned to your enrolled courses and submit evidence for verification.
              </p>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <span className="badge bg-success">Web Development</span>
                <Link to="/explore" className="btn btn-outline-success btn-sm">
                  Explore Skills →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-warning">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold text-dark mb-0">Verification Requests</h5>
                <span className="fs-3">⏳</span>
              </div>
              <p className="text-muted small">
                Track status of your submitted evidence requests or submit new skill verifications.
              </p>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <Link to="/student/submit-verification" className="btn btn-outline-primary btn-sm">
                  + Submit New
                </Link>
                <Link to="/student/my-requests" className="btn btn-warning btn-sm text-dark fw-semibold">
                  View Requests →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
