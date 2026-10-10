import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const MyCoursesSection = ({ onRefreshPassport }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/students/me/enrollments');
      setEnrollments(res.data.enrollments || []);
    } catch (err) {
      console.error('Failed to fetch enrollments:', err);
      setError('Unable to load your enrolled courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleUnenroll = async (courseId) => {
    if (!window.confirm('Are you sure you want to unenroll from this course?')) {
      return;
    }
    try {
      setActionLoadingId(courseId);
      await api.put(`/courses/${courseId}/unenroll`);
      await fetchEnrollments();
      if (onRefreshPassport) onRefreshPassport();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to unenroll from course.';
      alert(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="my-courses-section mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="my-courses-section-title">
            <span className="material-symbols-outlined align-middle me-2 text-primary">
              school
            </span>
            My Enrolled Courses
          </h2>
        </div>
        <div className="text-center py-4 bg-white rounded-3 border">
          <div className="spinner-border spinner-border-sm text-primary mb-2" role="status">
            <span className="visually-hidden">Loading courses...</span>
          </div>
          <p className="text-muted small m-0">Loading your enrolled courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-courses-section mb-4">
        <div className="alert alert-warning d-flex align-items-center justify-content-between rounded-3">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={fetchEnrollments}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="my-courses-section mb-4" aria-label="My Enrolled Courses">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="my-courses-section-title m-0">
            <span
              className="material-symbols-outlined align-middle me-2"
              style={{ color: '#0052b4', fontVariationSettings: "'FILL' 1" }}
            >
              bookmark
            </span>
            My Enrolled Courses
          </h2>
          <p className="text-muted small m-0 mt-1">
            Track your progress across courses and micro-skill credentials
          </p>
        </div>
        <Link to="/explore" className="btn btn-sm btn-outline-primary d-none d-sm-inline-flex align-items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            add
          </span>
          Browse Courses
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <div className="my-courses-empty-card">
          <div className="my-courses-empty-icon">
            <span className="material-symbols-outlined">school</span>
          </div>
          <h3 className="my-courses-empty-title">You haven't enrolled in any courses yet</h3>
          <p className="my-courses-empty-desc">
            Browse Explore Skills to get started. Enrolling allows you to bookmark courses and track your skill completion right here.
          </p>
          <Link
            to="/explore"
            className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 py-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              explore
            </span>
            Browse Explore Skills
          </Link>
        </div>
      ) : (
        <div className="my-courses-grid">
          {enrollments.map((item) => {
            const course = item.course || {};
            const total = item.totalCount || 0;
            const earned = item.earnedCount || 0;
            const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
            const isCompleted = item.status === 'completed' || (total > 0 && earned >= total);
            const isProcessing = actionLoadingId === course._id;

            return (
              <div
                key={item._id || course._id}
                className={`my-courses-card ${isCompleted ? 'completed-border' : ''}`}
              >
                <div className="my-courses-card-header">
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <span className="my-courses-course-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        auto_stories
                      </span>
                      Course
                    </span>
                    {isCompleted ? (
                      <span className="my-courses-status-chip completed">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        Completed
                      </span>
                    ) : (
                      <span className="my-courses-status-chip active">
                        <span className="my-courses-status-dot"></span>
                        Active
                      </span>
                    )}
                  </div>
                  <h3 className="my-courses-card-title">{course.name || 'Untitled Course'}</h3>
                  <p className="my-courses-card-desc">
                    {course.description || 'No description provided.'}
                  </p>
                </div>

                <div className="my-courses-card-body">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="my-courses-progress-label">Skill Progress</span>
                    <span className="my-courses-progress-stat">
                      <strong>{earned}</strong> / {total} Skills ({percent}%)
                    </span>
                  </div>
                  <div className="my-courses-progress-track">
                    <div
                      className={`my-courses-progress-fill ${isCompleted ? 'bg-success' : ''}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="my-courses-card-footer">
                  <Link
                    to={`/explore?search=${encodeURIComponent(course.name || '')}`}
                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      visibility
                    </span>
                    View Skills
                  </Link>
                  {!isCompleted && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger text-decoration-none p-0 d-inline-flex align-items-center gap-1"
                      onClick={() => handleUnenroll(course._id)}
                      disabled={isProcessing}
                      title="Unenroll from this course"
                    >
                      {isProcessing ? (
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            close
                          </span>
                          Unenroll
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MyCoursesSection;
