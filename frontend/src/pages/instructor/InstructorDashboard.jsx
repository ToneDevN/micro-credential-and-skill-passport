import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const InstructorDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold text-dark mb-1">Instructor Dashboard</h2>
          <p className="text-muted mb-0">
            Welcome back, <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>
        <span className="badge bg-warning text-dark px-3 py-2 text-uppercase fs-6">
          Instructor Portal
        </span>
      </div>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-primary">
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold text-dark mb-0">Managed Courses</h5>
                <span className="fs-3">📖</span>
              </div>
              <p className="text-muted small mb-3">
                Oversee course curriculum, manage course details, and configure skill alignments.
              </p>
              <div className="mt-auto">
                <Link to="/instructor/courses" className="btn btn-primary btn-sm w-100 fw-semibold">
                  Manage Courses &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-danger">
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold text-dark mb-0">Verification Queue</h5>
                <span className="fs-3">📋</span>
              </div>
              <p className="text-muted small mb-3">
                Review student evidence submissions, provide constructive feedback, and approve skill badges.
              </p>
              <div className="mt-auto">
                <Link to="/instructor/requests" className="btn btn-danger btn-sm w-100 fw-semibold">
                  Review Requests &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 border-top border-4 border-success d-flex flex-column">
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold text-dark mb-0">Certification Analytics</h5>
                <span className="fs-3">📊</span>
              </div>
              <p className="text-muted small">
                Skill certification rates, ledger distributions, and performance insights across your courses.
              </p>
              <div className="mt-auto">
                <Link to="/instructor/analytics" className="btn btn-success btn-sm w-100 fw-semibold">
                  View Analytics &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
